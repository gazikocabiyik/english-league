import { h, icon, toast } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { lessonLevels } from '../../core/levels.js';
import { award } from '../league/award.js';
import { createInterview } from './interview.js';

function answerParts(text) {
  const [before, after = ''] = text.split('___');
  return text.includes('___') ? [before, h('span', { class: 'blank' }), after] : [text];
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

    const back = h('button', { onclick: () => ctx.go('#/panel') }, 'Panele dön');
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
    // Uyarlanır seviye: Mock Interview sınıf seviyesinin bir üstünde oynar
    const level = lessonLevels(ctx.store.ensureDailyLevel(ctx.classId)).interview;
    const iv = createInterview(unit, { level, students: cls.students });
    const teamOf = s => cls.teams.find(t => t.id === s.teamId);

    if (!iv.pair) {
      el.replaceChildren(h('section', { class: 'screen' },
        h('h1', { class: 'display' }, 'Mock Interview'),
        h('p', { class: 'tape callout' }, 'Mülakat için en az 2 öğrenci gerekli. ', h('a', { href: '#/setup' }, 'Öğrencileri ekle')), back));
      return;
    }

    const rec = (ok, eventId) => ctx.store.addAttempt({ classId: ctx.classId, level: iv.level, ok, activity: 'interview', eventId });
    let lastMiss = 0;

    function point(s) {
      const se = award(ctx, 'student', s, 1, 'Mock Interview');
      if (!se) return;
      const team = teamOf(s);
      const te = team ? award(ctx, 'team', team, 1, `Mock Interview · ${s.name}`) : null;
      rec(true, (te ?? se).id); // "Geri al" önce bu olayı siler, denemeyle birlikte
    }
    function missed(s) {
      if (Date.now() - lastMiss < 500) return;
      lastMiss = Date.now();
      rec(false);
      toast(`${s.name}: bilemedi`);
    }
    function step(dir) {
      if (dir > 0) iv.next(); else iv.prev();
      render(!iv.done);
    }
    function newPair() { iv.newPair(); render(true); }

    const onKey = e => { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', onKey);
    this.unmount = () => { alive = false; document.removeEventListener('keydown', onKey); ctx.sound.stopSpeaking(); };

    const person = (role, s) => h('span', { class: 'role tape' },
      h('span', { class: 'role-door', style: { '--team': teamOf(s) ? `var(--${teamOf(s).color})` : 'var(--surface-2)' } }),
      h('span', { class: 'role-name' }, `${role}: `, h('b', {}, s.name)));

    const scoreBox = (label, s) => h('div', { class: 'person-score' },
      h('span', { class: 'person-label' }, label),
      h('button', { class: 'go', onclick: () => point(s) }, `+1 ${s.name}`),
      h('button', { class: 'nobody', onclick: () => missed(s) }, 'Bilemedi'));

    function render(announce) {
      const { interviewer, candidate } = iv.pair;
      const { q, a } = iv.question();
      const img = h('img', {
        class: 'word-photo', src: `content/${iv.job.img}`, alt: iv.job.word,
        onerror: () => img.replaceWith(h('div', { class: 'photo-missing' }, `Görsel yok: ${iv.job.img}`)),
      });

      const body = iv.done
        ? h('div', { class: 'stage hired' },
          h('p', { class: 'hired-stamp stamp', lang: 'en' }, 'HIRED!'),
          h('p', { class: 'hired-line', lang: 'en' }, `${candidate.name} is our new ${iv.job.word}!`),
          h('button', { class: 'go wide', onclick: newPair }, icon('users-three'), ' Yeni ikili'))
        : h('div', { class: 'stage stage-word interview' },
          h('div', { class: 'job' }, img, h('span', { class: 'job-name tape', lang: 'en' }, iv.job.word.toLocaleUpperCase('en'))),
          h('div', { class: 'word-side' },
            h('span', { class: 'q-label' }, `${interviewer.name} sorar:`),
            h('button', { class: 'question', lang: 'en', onclick: () => ctx.sound.speak(q) }, q),
            h('span', { class: 'q-label' }, `${candidate.name} cevaplar:`),
            h('p', { class: 'frame', lang: 'en' }, answerParts(a)),
            iv.level === 'B1' && unit.b1Extend ? h('span', { class: 'tape hint-chip', lang: 'en' }, unit.b1Extend) : null),
          h('div', { class: 'scores' }, scoreBox('Mülakatçı', interviewer), scoreBox('Aday', candidate)));

      el.replaceChildren(h('section', { class: 'screen coach mock' },
        h('header', { class: 'coach-head' },
          h('div', { class: 'roles' }, person('Interviewer', interviewer), person('Candidate', candidate)),
          h('button', { class: 'ghost', onclick: newPair }, icon('users-three'), ' İkiliyi değiştir'),
          h('span', { class: 'level-chip', title: 'Mülakat seviyesi' }, iv.level),
          h('span', { class: 'progress' }, `${Math.min(iv.index + 1, iv.total)} / ${iv.total}`)),
        body,
        h('div', { class: 'nav-btns' },
          h('button', { class: 'nav', 'aria-label': 'Önceki soru', onclick: () => step(-1) }, icon('caret-left')),
          iv.done ? null : h('button', { class: 'say-again', 'aria-label': 'Soruyu oku', onclick: () => ctx.sound.speak(q) }, icon('speaker-high'), ' Soruyu oku'),
          iv.done ? h('span') : h('button', { class: 'nav next', 'aria-label': 'Sonraki soru', onclick: () => step(1) }, icon('caret-right')))));
      if (announce && !iv.done) ctx.sound.speak(q);
    }

    render(true);
  },
};
