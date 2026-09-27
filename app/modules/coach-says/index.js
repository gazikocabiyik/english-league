import { h, icon } from '../../core/dom.js';
import { loadIndex, loadUnit } from '../../core/content.js';
import { reviewPlan, pickReview } from '../../core/spiral.js';
import { createSession, PHASES } from './session.js';
import { award } from '../league/award.js';

const PHASE_LABELS = { move: '1 · Hareket', speak: '2 · Konuşma', exit: '3 · Çıkış bileti' };

export function fillFrame(text, word) {
  return text.replace('___', word).replace(/\s*…\s*$/, '');
}

function frameParts(text) {
  const [before, after = ''] = text.split('___');
  return [before, h('span', { class: 'blank' }), after];
}

export default {
  id: 'coach-says',
  title: 'Coach Says',
  unmount() {},
  async mount(el, ctx) {
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
    const review = pickReview(plan, unitsByNo, { exclude: unit.vocab.map(v => v.word) });
    const session = createSession(unit, { review });
    const cls = ctx.store.getClass(ctx.classId);
    const answered = new Set(); // çıkış biletinde bu kelimede puan alanlar
    let showTr = false;

    const onKey = e => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    // Geri alınan çıkış bileti puanı, öğrencinin çipini yeniden açar.
    const onScores = e => {
      const undone = e.detail?.undone;
      if (undone?.targetType === 'student' && answered.delete(undone.targetId)) render(false);
    };
    let lastSkip = 0;
    const skip = () => { if (Date.now() - lastSkip > 500) { lastSkip = Date.now(); step(1); } };
    document.addEventListener('keydown', onKey);
    document.addEventListener('scores-changed', onScores);
    this.unmount = () => {
      alive = false;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('scores-changed', onScores);
      ctx.sound.stopSpeaking();
    };

    function setPhase(p) { session.setPhase(p); answered.clear(); render(true); }

    function step(dir) {
      const moved = dir > 0 ? session.next() : session.prev();
      if (moved) { answered.clear(); render(true); return; }
      if (dir < 0) return;
      const i = PHASES.indexOf(session.phase);
      if (i < PHASES.length - 1) setPhase(PHASES[i + 1]);
      else ctx.go('#/league');
    }

    function teamButtons() {
      if (!cls.teams.length) return h('p', { class: 'callout' }, 'Takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur'));
      return h('div', { class: 'team-buttons' },
        cls.teams.map(t => h('button', {
          class: 'team-btn', style: { '--team': `var(--${t.color})` }, 'aria-label': `${t.name} doğru söyledi: +1`,
          onclick: () => { award(ctx, 'team', t, 1, 'Coach Says'); step(1); },
        }, t.name)),
        h('button', { class: 'nobody', onclick: skip }, 'Kimse bilemedi'));
    }

    function studentChips() {
      if (!cls.students.length) return h('p', { class: 'callout' }, 'Öğrenci listesi yok. ', h('a', { href: '#/setup' }, 'Öğrencileri ekle'));
      return h('div', { class: 'student-chips' }, cls.students.map(s => h('button', {
        class: `chip${answered.has(s.id) ? ' is-done' : ''}`,
        disabled: answered.has(s.id),
        onclick: () => { if (award(ctx, 'student', s, 1, 'Çıkış bileti')) { answered.add(s.id); render(false); } },
      }, s.name)));
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
          img,
          h('div', { class: 'word-side' },
            c.reviewOf ? h('span', { class: 'tape review-tag' }, `Tekrar · Ü${c.reviewOf}`) : null,
            h('button', { class: `word${c.word.length > 9 ? ' is-long' : ''}`, lang: 'en', onclick: () => ctx.sound.speak(c.word) }, c.word.toLocaleUpperCase('en')),
            showTr && c.tr ? h('p', { class: 'tr tape' }, c.tr) : null,
            h('p', { class: 'frame', lang: 'en', onclick: () => ctx.sound.speak(fillFrame(c.frameText, c.word)) }, frameParts(c.frameText)),
            h('button', { class: 'ghost small', onclick: () => { showTr = !showTr; render(false); } }, showTr ? 'Türkçeyi gizle' : 'Türkçe')),
          session.phase === 'speak' ? teamButtons() : studentChips());
        if (announce) ctx.sound.speak(c.word);
      }

      el.replaceChildren(h('section', { class: `screen coach phase-${session.phase}` },
        h('header', { class: 'coach-head' },
          h('nav', { class: 'phase-tabs' }, PHASES.map(p =>
            h('button', { class: p === session.phase ? 'is-on' : '', onclick: () => setPhase(p) }, PHASE_LABELS[p]))),
          h('span', { class: 'progress' }, `${session.index + 1} / ${session.total}`)),
        stage,
        h('div', { class: 'nav-btns' },
          h('button', { class: 'nav', 'aria-label': 'Önceki', onclick: () => step(-1) }, icon('caret-left')),
          c.type === 'command' ? h('button', { class: 'say-again', 'aria-label': 'Tekrar oku', onclick: () => ctx.sound.speak(c.text) }, icon('speaker-high'), ' Tekrar oku') : null,
          h('button', { class: 'nav next', 'aria-label': 'Sonraki', onclick: () => step(1) }, icon('caret-right')))));
    }

    render(true);
  },
};
