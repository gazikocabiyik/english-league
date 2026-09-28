import { h, icon, toast } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { lessonLevels } from '../../core/levels.js';
import { award } from '../league/award.js';
import { createInterview } from './interview.js';

// Cevap: işaretli boşluk ve öğrencinin kendi dolduracağı "___" sarı çizgi olarak gösterilir
function answerParts(parts) {
  return parts.flatMap(p => (typeof p === 'string'
    ? p.split('___').flatMap((t, k) => (k ? [h('span', { class: 'blank' }), t] : [t]))
    : [h('span', { class: 'blank gap' })]));
}

export default {
  id: 'mock-interview',
  title: 'Mock Interview',
  unmount() {},
  async mount(el, ctx) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    this.unmount = () => { alive = false; };
    const { unit, errors } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;

    const back = h('div', { class: 'today-actions' },
      h('button', { onclick: () => ctx.go('#/panel') }, 'Panele dön'),
      h('button', { class: 'go', onclick: () => ctx.finishActivity('#/game/coach-says/exit') }, 'Sonraki adım ', icon('caret-right'))); // ders planında adımı geçer
    if (!unit) {
      el.replaceChildren(h('section', { class: 'screen error' }, h('h1', { class: 'display' }, 'Ünite açılamadı'), h('ul', {}, errors.map(e => h('li', {}, e))), back));
      return;
    }
    if (!unit.interview) {
      el.replaceChildren(h('section', { class: 'screen' },
        h('h1', { class: 'display' }, 'Bu ünitede mülakat yok'),
        h('p', { class: 'hint' }, 'Mock Interview şimdilik 11. sınıf 1. ünitede (Future Jobs) var.'), back));
      return;
    }

    const cls = ctx.store.getClass(ctx.classId);
    // Mülakat sınıfın o dersteki seviyesinde oynar
    const level = lessonLevels(ctx.store.classLevel(ctx.classId)).interview;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const candidatesToday = ctx.store.attemptsOf(ctx.classId, { since: dayStart.getTime() }).filter(a => a.activity === 'interview' && a.studentId).map(a => a.studentId);
    const lessonNo = await ctx.lessonNo();
    const iv = createInterview(unit, { level, lesson: lessonNo, students: ctx.store.presentStudents(ctx.classId), candidatesToday: [...new Set(candidatesToday)] }); // yalnız bugün gelenler
    const teamOf = s => cls.teams.find(t => t.id === s.teamId);

    if (!iv.pair) {
      el.replaceChildren(h('section', { class: 'screen' },
        h('h1', { class: 'display' }, 'Mock Interview'),
        h('p', { class: 'tape callout' }, 'Mülakat için en az 2 öğrenci gerekli. ', h('a', { href: '#/setup' }, 'Öğrencileri ekle')), back));
      return;
    }

    const answeredQ = new Set(); // bu turda işaretlenmiş soru numaraları (geri dönünce yeniden "bilemedi" sayılmaz)
    let lastGroup = null; // son sorudaki doğru cevabın puan grubu
    const rec = (ok, eventId) => { answeredQ.add(iv.index); ctx.store.addAttempt({ classId: ctx.classId, level: iv.level, ok, activity: 'interview', eventId, studentId: iv.pair.candidate.id }); };
    let thanked = false; // bu turda mülakatçı katılım puanı aldı mı
    let lastMiss = 0;
    const lastPoint = {};

    // Mülakatçı soruları okuduğu için tur bitince +1 katılım puanı alır (seviye ölçümüne girmez)
    function thankInterviewer() {
      if (thanked) return;
      thanked = true;
      const s = iv.pair.interviewer;
      // Son soru "Doğru" ile bittiyse katılım puanı onunla aynı grupta: tek "Geri al" ikisini birlikte siler
      const groupId = lastGroup ?? `ivk-${Date.now()}-${s.id}`;
      if (!award(ctx, 'student', s, 1, 'Mülakatçı', groupId)) return;
      const team = teamOf(s);
      if (team) award(ctx, 'team', team, 1, `Mülakatçı · ${s.name}`, groupId);
      toast(`${s.name} +1 (mülakatçı)`);
    }

    function point(s) {
      // Çift dokunuş koruması: aynı öğrenciye 500 ms içinde ikinci puan yok
      if (Date.now() - (lastPoint[s.id] ?? 0) < 500) return false;
      lastPoint[s.id] = Date.now();
      const groupId = `iv-${Date.now()}-${s.id}`; // öğrenci + takım puanı tek "Geri al" ile birlikte gider
      lastGroup = groupId;
      const se = award(ctx, 'student', s, 1, 'Mock Interview', groupId);
      if (!se) return false;
      const team = teamOf(s);
      const te = team ? award(ctx, 'team', team, 1, `Mock Interview · ${s.name}`, groupId) : null;
      rec(true, (te ?? se).id); // "Geri al" önce bu olayı siler, denemeyle birlikte
      return true;
    }
    function missed(s) {
      if (Date.now() - lastMiss < 500) return false;
      lastMiss = Date.now();
      rec(false);
      lastGroup = null;
      toast(`${s.name}: bilemedi`);
      return true;
    }
    function step(dir) {
      reveal = false;
      if (dir > 0 && !iv.done && !answeredQ.has(iv.index)) rec(false); // işaretlenmeden geçilen soru = bilemedi
      if (dir > 0 && !iv.done && iv.index < iv.total - 1) lastGroup = null;
      if (dir > 0) iv.next(); else iv.prev();
      if (iv.done) thankInterviewer();
      render(!iv.done);
    }
    const resetRound = () => { answeredQ.clear(); thanked = false; lastGroup = null; reveal = false; };
    function newPair() { iv.newPair(); resetRound(); render(true); }
    function nextRound() { iv.nextRound(); resetRound(); render(true); }
    // Katılım puanı geri alınırsa tur bitince yeniden verilebilsin
    const onScores = e => { if (e.detail?.undone?.reason?.includes('Mülakatçı')) thanked = false; };

    const onKey = e => { if (summary) return; if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }; // özetteyken görünmeyen adaya kayıt düşmesin
    document.addEventListener('keydown', onKey);
    document.addEventListener('scores-changed', onScores);
    this.unmount = () => { alive = false; document.removeEventListener('keydown', onKey); document.removeEventListener('scores-changed', onScores); ctx.sound.stopSpeaking(); };

    const person = (role, s) => h('span', { class: 'role tape' },
      h('span', { class: 'role-door', style: { '--team': teamOf(s) ? `var(--${teamOf(s).color})` : 'var(--surface-2)' } }),
      h('span', { class: 'role-name' }, `${role}: `, h('b', {}, s.name)));

    let reveal = false; // öğretmen "Cevabı göster" dedi mi
    const gapCache = new Map();
    let summary = iv.allCandidatesDone && candidatesToday.length > 0; // bugün herkes zaten aday olduysa özetle başla
    const nextActivity = () => ctx.finishActivity('#/game/coach-says/exit'); // ders planı ya da serbest akış: çıkış bileti

    function finishedScreen() {
      const todays = ctx.store.attemptsOf(ctx.classId, { since: dayStart.getTime() }).filter(a => a.activity === 'interview');
      const cands = new Set(todays.map(a => a.studentId)).size;
      const rate = todays.length ? Math.round((todays.filter(a => a.ok).length / todays.length) * 100) : 0;
      return h('div', { class: 'stage hired' },
        h('p', { class: 'hired-stamp', lang: 'en' }, 'ALL HIRED!'),
        h('p', { class: 'hired-line' }, `Şube mülakatları bitti: ${cands} aday · doğru oranı %${rate}`),
        h('div', { class: 'today-actions' },
          h('button', { class: 'ghost', onclick: () => { summary = false; nextRound(); } }, 'Bir tur daha'),
          h('button', { class: 'go wide', onclick: nextActivity }, 'Sıradaki etkinlik ', icon('caret-right'))));
    }

    function render(announce) {
      const { interviewer, candidate } = iv.pair;
      // Aynı soruda boşluk ve kelime bankası sabit kalsın (cevabı göster/gizle karıştırmasın)
      const key = `${iv.pair.candidate.id}:${iv.job.word}:${iv.index}`;
      if (!gapCache.has(key)) gapCache.set(key, iv.question());
      const { q, gap } = gapCache.get(key);
      const hasGap = gap.parts.some(p => typeof p !== 'string');
      const img = h('img', {
        class: 'word-photo', src: `content/${iv.job.img}`, alt: iv.job.word,
        onerror: () => img.replaceWith(h('div', { class: 'photo-missing' }, `Görsel yok: ${iv.job.img}`)),
      });

      const body = summary ? finishedScreen() : iv.done
        ? h('div', { class: 'stage hired' },
          h('p', { class: 'hired-stamp stamp', lang: 'en' }, 'HIRED!'),
          h('p', { class: 'hired-line', lang: 'en' }, `${candidate.name} is our new ${iv.job.word}!`),
          iv.allCandidatesDone
            ? h('button', { class: 'go wide', onclick: () => { summary = true; render(false); } }, icon('check'), ' Mülakatlar bitti: özet')
            : h('button', { class: 'go wide', onclick: nextRound }, icon('users-three'), ` Sıradaki: ${candidate.name} soruyor`))
        : h('div', { class: 'stage stage-word interview' },
          h('div', { class: 'job photo' }, img, h('span', { class: 'job-name tape', lang: 'en' }, iv.job.word.toLocaleUpperCase('en'))),
          h('div', { class: 'word-side' },
            h('span', { class: 'q-label' }, `${interviewer.name} sorar:`),
            h('button', { class: 'question', lang: 'en', onclick: () => ctx.sound.speak(q) }, q),
            h('span', { class: 'q-label' }, `${candidate.name} cevaplar:`),
            h('p', { class: 'frame', lang: 'en' }, reveal ? gap.answer : answerParts(gap.parts)),
            !reveal && gap.hint ? h('span', { class: 'tape hint-chip', lang: 'en' }, `İpucu: ${gap.hint}`) : null,
            !reveal && gap.options ? h('div', { class: 'word-bank', lang: 'en' }, gap.options.map(o => h('span', { class: 'bank-word' }, o))) : null,
            hasGap ? h('button', { class: 'ghost small', onclick: () => { reveal = !reveal; render(false); } }, reveal ? 'Cevabı gizle' : 'Cevabı göster') : null,
            ['B1', 'B2'].includes(iv.level) && unit.b1Extend ? h('span', { class: 'tape hint-chip', lang: 'en' }, unit.b1Extend) : null),
          h('div', { class: 'scores one' },
            h('span', { class: 'person-label' }, `${candidate.name} doğru cevapladı mı?`),
            h('button', { class: 'go', onclick: () => { if (point(candidate)) step(1); } }, icon('check'), ' Doğru'),
            h('button', { class: 'nobody', onclick: () => { if (missed(candidate)) step(1); } }, icon('x'), ' Bilemedi')));

      el.replaceChildren(h('section', { class: 'screen coach mock' },
        h('header', { class: 'coach-head' },
          h('div', { class: 'roles' }, person('Interviewer', interviewer), person('Candidate', candidate)),
          summary ? null : h('button', { class: 'ghost', onclick: newPair }, icon('users-three'), ' İkiliyi değiştir'),
          h('button', { class: 'ghost', onclick: nextActivity }, 'Etkinliği bitir'),
          h('span', { class: 'level-chip', title: 'Mülakat seviyesi' }, iv.level),
          h('span', { class: 'progress' }, `${Math.min(iv.index + 1, iv.total)} / ${iv.total}`)),
        body,
        summary ? null : h('div', { class: 'nav-btns' },
          h('button', { class: 'nav', 'aria-label': 'Önceki soru', onclick: () => step(-1) }, icon('caret-left')),
          iv.done ? null : h('button', { class: 'say-again', 'aria-label': 'Soruyu oku', onclick: () => ctx.sound.speak(q) }, icon('speaker-high'), ' Soruyu oku'),
          iv.done ? h('span') : h('button', { class: 'nav next', 'aria-label': 'Sonraki soru', onclick: () => step(1) }, icon('caret-right')))));
      if (announce && !iv.done && !summary) ctx.sound.speak(q);
    }

    render(true);
  },
};
