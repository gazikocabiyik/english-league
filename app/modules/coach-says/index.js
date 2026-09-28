import { h, icon, toast } from '../../core/dom.js';
import { loadIndex, loadUnit } from '../../core/content.js';
import { reviewPlan, pickReview } from '../../core/spiral.js';
import { fillFrame } from '../../core/speech-map.js';
import { lessonLevels } from '../../core/levels.js';
import { currentRoute } from '../../core/lesson-plan.js';
import { createSession, PHASES } from './session.js';
import { createPicker } from './picker.js';
import { award } from '../league/award.js';

const PHASE_LABELS = { move: '1 · Hareket', speak: '2 · Konuşma', exit: '3 · Çıkış bileti' };

// Ekranda kelime görünür, bu yüzden a/an doğru artikelle gösterilir
function frameParts(text, word = '') {
  text = text.replace('a/an ___', `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ___`);
  const [before, after = ''] = text.split('___');
  return [before, h('span', { class: 'blank' }), after];
}

export default {
  id: 'coach-says',
  title: 'Coach Says',
  unmount() {},
  // startPhase: 'exit' → doğrudan çıkış bileti (ünite görevi bitince buraya dönülür)
  async mount(el, ctx, [startPhase] = []) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true; // yükleme sürerken ekrandan çıkılırsa dinleyici bırakma
    this.unmount = () => { alive = false; };
    const { unit, errors } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;
    if (!unit) {
      el.append(h('section', { class: 'screen error' },
        h('h1', { class: 'display' }, 'Ünite açılamadı'),
        h('ul', {}, errors.map(e => h('li', {}, e))),
        h('button', { onclick: () => ctx.go('#/panel') }, 'Panele dön')));
      return;
    }

    // Sarmal tekrar: önceki ünitelerden kelimeler konuşma turuna karışır
    const available = (await loadIndex())[ctx.grade] ?? [];
    const plan = reviewPlan(ctx.unit, 8).filter(p => available.includes(p.unit));
    const loaded = await Promise.all(plan.map(p => loadUnit(ctx.grade, p.unit)));
    if (!alive) return;
    const unitsByNo = Object.fromEntries(loaded.filter(r => r.unit).map(r => [r.unit.unit, r.unit]));
    // Uyarlanır seviye: konuşma L, çıkış bileti L+2
    const lv = lessonLevels(ctx.store.classLevel(ctx.classId));
    const review = pickReview(plan, unitsByNo, { exclude: unit.vocab.map(v => v.word), level: lv.speak });
    // Günün kelimeleri: konuşma turu ve çıkış bileti aynı gün aynı kelimeleri kullanır
    const dayWordsKey = `words:${ctx.classId}:${ctx.unit}:${new Date().toLocaleDateString('sv-SE')}`;
    const session = createSession(unit, { review, level: lv.speak, exitLevel: lv.exit, words: ctx.store.getSetting(dayWordsKey, []) });
    ctx.store.setSetting(dayWordsKey, session.words.map(w => w.word));
    const markedCards = new Set(); // "tur:index" — işaretlenmiş kartlar
    const cardKey = () => `${session.phase}:${session.index}`;
    const isMarked = () => markedCards.has(cardKey());
    const rec = (ok, eventId, studentId) => { markedCards.add(cardKey()); ctx.store.addAttempt({ classId: ctx.classId, level: session.level, ok, activity: session.phase, eventId, studentId }); };
    let lastMiss = 0;
    const miss = studentId => { if (Date.now() - lastMiss > 500) { lastMiss = Date.now(); rec(false, undefined, studentId); return true; } return false; };
    const cls = ctx.store.getClass(ctx.classId);
    // Bugün çıkış biletinde seçilmiş öğrenciler sona kalır
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const pickedToday = ctx.store.attemptsOf(ctx.classId, { since: dayStart.getTime() }).filter(a => a.activity === 'exit' && a.studentId).map(a => a.studentId);
    const picker = createPicker(ctx.store.presentStudents(ctx.classId), { excludeIds: pickedToday }); // yalnız bugün gelenler
    const luckyByIndex = new Map(); // kelime → seçilen öğrenci (geri dönünce aynı öğrenci)
    let lucky = null;
    let lastLucky = 0; // Doğru/Bilemedi çift dokunuş koruması
    let showTr = false;

    const onKey = e => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    let lastSkip = 0;
    const skip = () => { if (Date.now() - lastSkip > 500) { lastSkip = Date.now(); if (!isMarked()) rec(false); step(1); } };
    document.addEventListener('keydown', onKey);
    this.unmount = () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
      ctx.sound.stopSpeaking();
    };

    function setPhase(p) { session.setPhase(p); render(true); }

    function step(dir) {
      // Puan ya da "bilemedi" verilmeden geçilen konuşma/çıkış kartı yanlış sayılır (seviye şişmesin)
      if (dir > 0 && session.phase !== 'move' && !isMarked() && !(session.phase === 'exit' && !lucky)) rec(false, undefined, session.phase === 'exit' ? lucky?.id : undefined);
      const moved = dir > 0 ? session.next() : session.prev();
      if (moved) { render(true); return; }
      if (dir < 0) return;
      // Ders planı çalışıyorsa bu tur bir adımdır: plandaki sıradaki adıma geç
      // Yalnız ders planının şu anki adımı olarak açılmış bu tur planı ilerletir; serbest oyun ya da sekme değişikliği ilerletmez
      const myRoute = `#/game/coach-says/${session.phase}`;
      if (ctx.inLesson() && location.hash === myRoute && currentRoute(unit, ctx.lessonProgress()) === myRoute) { ctx.finishActivity('#/panel', myRoute); return; }
      const i = PHASES.indexOf(session.phase);
      // Serbest akış: konuşma turundan sonra ünitenin görev oyunu (L+1), sonra çıkış bileti (L+2)
      const mission = unit.interview ? 'mock-interview' : unit.dj ? 'warmup-dj' : null;
      if (session.phase === 'speak' && mission) ctx.go(`#/game/${mission}`);
      else if (i < PHASES.length - 1) setPhase(PHASES[i + 1]);
      else ctx.go('#/league');
    }

    function teamButtons() {
      if (!cls.teams.length) return h('p', { class: 'callout' }, 'Takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur'));
      return h('div', { class: 'team-buttons' },
        cls.teams.map(t => h('button', {
          class: 'team-btn', style: { '--team': `var(--${t.color})` }, 'aria-label': `${t.name} doğru söyledi: +1`,
          onclick: () => { const e = award(ctx, 'team', t, 1, 'Coach Says'); if (!e) return; rec(true, e.id); step(1); }, // çift dokunuş kart atlatmasın
        }, t.name)),
        h('button', { class: 'nobody', onclick: skip }, 'Kimse bilemedi'));
    }

    // Şanslı öğrenci: her kelimede tahta bir öğrenci seçer, öğretmen tek dokunuşla işaretler
    function luckyBar() {
      if (!ctx.store.presentStudents(ctx.classId).length) return h('p', { class: 'callout' }, 'Bugün derste öğrenci yok. ', h('a', { href: '#/today' }, 'Yoklamayı aç'));
      if (!luckyByIndex.has(session.index)) luckyByIndex.set(session.index, picker.pick());
      lucky = luckyByIndex.get(session.index);
      const once = () => { if (Date.now() - lastLucky < 500) return false; lastLucky = Date.now(); return true; };
      const team = cls.teams.find(t => t.id === lucky.teamId);
      return h('div', { class: 'lucky' },
        h('span', { class: 'tape lucky-name' },
          h('span', { class: 'role-door', style: { '--team': team ? `var(--${team.color})` : 'var(--surface-2)' } }),
          'Sıra: ', h('b', {}, lucky.name)),
        h('button', { class: 'go lucky-ok', onclick: () => {
          if (!once()) return;
          const e = award(ctx, 'student', lucky, 1, 'Çıkış bileti');
          if (!e) return;
          rec(true, e.id, lucky.id);
          step(1);
        } }, icon('check'), ' Doğru'),
        h('button', { class: 'nobody lucky-no', onclick: () => { if (once() && miss(lucky.id)) step(1); } }, icon('x'), ' Bilemedi'),
        h('button', { class: 'ghost small', onclick: () => { lucky = picker.skip(); luckyByIndex.set(session.index, lucky); render(false); } }, 'Başka öğrenci'));
    }

    function render(announce) {
      const c = session.current();
      let stage;
      if (c.type === 'command') {
        // Uzun komut sarı alanın dışına taşmasın: harf sayısına göre boyut
        const size = c.text.length <= 22 ? 'is-short' : c.text.length <= 36 ? 'is-mid' : 'is-long';
        stage = h('div', { class: 'stage stage-move' },
          h('p', { class: `command ${size}`, lang: 'en' }, c.text.toLocaleUpperCase('en')));
        if (announce) ctx.sound.speak(c.text);
      } else {
        const img = h('img', {
          class: 'word-photo', src: `content/${c.img}`, alt: c.word,
          onerror: () => { img.replaceWith(h('div', { class: 'photo-missing' }, `Görsel yok: ${c.img}`)); console.warn('Eksik görsel:', c.img); },
        });
        stage = h('div', { class: 'stage stage-word' },
          h('div', { class: 'photo' }, img),
          h('div', { class: 'word-side' },
            c.reviewOf ? h('span', { class: 'tape review-tag' }, `Tekrar · Ü${c.reviewOf}`) : null,
            h('button', { class: `word${c.word.length > 9 ? ' is-long' : ''}`, lang: 'en', onclick: () => ctx.sound.speak(c.word) }, c.word.toLocaleUpperCase('en')),
            showTr && c.tr ? h('p', { class: 'tr tape' }, c.tr) : null,
            session.level === 'B1' && unit.b1Extend ? h('span', { class: 'tape hint-chip', lang: 'en' }, unit.b1Extend) : null,
            h('p', { class: `frame${c.frameText.length > 34 ? ' is-long' : ''}`, lang: 'en', onclick: () => ctx.sound.speak(fillFrame(c.frameText, c.word)) }, frameParts(c.frameText, c.word)),
            h('button', { class: 'ghost small', onclick: () => { showTr = !showTr; render(false); } }, showTr ? 'Türkçeyi gizle' : 'Türkçe')),
          session.phase === 'speak' ? teamButtons() : luckyBar());
        if (announce) ctx.sound.speak(c.word);
      }

      el.replaceChildren(h('section', { class: `screen coach phase-${session.phase}` },
        h('header', { class: 'coach-head' },
          h('nav', { class: 'phase-tabs' }, PHASES.map(p =>
            h('button', { class: p === session.phase ? 'is-on' : '', onclick: () => setPhase(p) }, PHASE_LABELS[p]))),
          h('span', { class: 'level-chip', title: 'Bu turun seviyesi' }, session.level),
          h('span', { class: 'progress' }, `${session.index + 1} / ${session.total}`)),
        stage,
        h('div', { class: 'nav-btns' },
          h('button', { class: 'nav', 'aria-label': 'Önceki', onclick: () => step(-1) }, icon('caret-left')),
          c.type === 'command' ? h('button', { class: 'say-again', 'aria-label': 'Tekrar oku', onclick: () => ctx.sound.speak(c.text) }, icon('speaker-high'), ' Tekrar oku') : null,
          h('button', { class: 'nav next', 'aria-label': 'Sonraki', onclick: () => step(1) }, icon('caret-right')))));
    }

    if (PHASES.includes(startPhase)) session.setPhase(startPhase);
    render(true);
  },
};
