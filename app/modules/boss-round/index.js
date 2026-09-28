import { h, icon, toast } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { lessonLevels } from '../../core/levels.js';
import { weekStart } from '../../core/store.js';
import { award } from '../league/award.js';
import { buildBoss } from './boss.js';

// Boss Round: ünite sonu 10 hızlı kart, ilk doğru takım +2; sonunda ünite rozeti.
export default {
  id: 'boss-round',
  title: 'Boss Round',
  hidden: true, // panelde kutu değil, ders planı adımı
  unmount() {},
  async mount(el, ctx) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    this.unmount = () => { alive = false; ctx.sound.stopSpeaking(); };
    const { unit, errors } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;
    const next = () => ctx.finishActivity('#/league');
    if (!unit) {
      el.replaceChildren(h('section', { class: 'screen error' }, h('h1', { class: 'display' }, 'Ünite açılamadı'), h('ul', {}, errors.map(e => h('li', {}, e)))));
      return;
    }
    const lv = lessonLevels(ctx.store.ensureDailyLevel(ctx.classId));
    const cards = buildBoss(unit, { levels: [lv.speak, lv.interview] });
    const cls = ctx.store.getClass(ctx.classId);
    const startTs = Date.now();
    let i = 0;
    let reveal = false;
    let last = 0;
    const once = () => { if (Date.now() - last < 500) return false; last = Date.now(); return true; };

    function mark(team) {
      if (!once()) return;
      const c = cards[i];
      const eventId = team ? award(ctx, 'team', team, 2, 'Boss Round')?.id : undefined;
      ctx.store.addAttempt({ classId: ctx.classId, level: c.level, ok: !!team, activity: 'boss', eventId });
      if (!team) toast('Kimse bilemedi');
      i++; reveal = false;
      render(true);
    }

    function badge() {
      const tries = ctx.store.attemptsOf(ctx.classId, { since: startTs }).filter(a => a.activity === 'boss');
      const rate = tries.length ? Math.round((tries.filter(a => a.ok).length / tries.length) * 100) : 0;
      const top = ctx.store.standings(ctx.classId, { since: weekStart(Date.now()) }).slice(0, 3);
      return h('div', { class: 'stage playlist boss-badge' },
        h('p', { class: 'playlist-title', lang: 'en' }, `UNIT ${ctx.unit} · ${unit.title.toLocaleUpperCase('en')}`),
        h('p', { class: 'hired-line' }, `Ünite tamam! Boss Round doğru oranı %${rate}`),
        h('ol', { class: 'playlist-list' }, top.map(t => h('li', {}, h('span', { class: 'pl-situation' }, t.name), h('span', { class: 'pl-genre' }, `${t.points} puan`), h('span')))),
        h('button', { class: 'go wide', onclick: next }, icon('trophy'), ctx.inLesson() ? ' Devam et' : ' Lige git'));
    }

    function render(announce) {
      if (i >= cards.length) {
        el.replaceChildren(h('section', { class: 'screen coach boss' }, badge()));
        return;
      }
      const c = cards[i];
      const img = c.img ? h('img', { class: 'word-photo', src: `content/${c.img}`, alt: '' }) : null;
      const parts = c.prompt.split('___');
      el.replaceChildren(h('section', { class: 'screen coach boss' },
        h('header', { class: 'coach-head' },
          h('span', { class: 'tape lucky-name' }, icon('trophy'), ' Boss Round'),
          h('span', { class: 'spacer' }),
          h('span', { class: 'level-chip' }, c.level),
          h('span', { class: 'progress' }, `${i + 1} / ${cards.length}`)),
        h('div', { class: `stage stage-word boss-card type-${c.type}` },
          img ? h('div', { class: 'photo' }, img) : h('div'),
          h('div', { class: 'word-side' },
            h('button', { class: 'question', lang: 'en', onclick: () => ctx.sound.speak(c.prompt.replace('___', '')) },
              parts.length > 1 ? [parts[0], h('span', { class: 'blank' }), parts[1]] : c.prompt),
            reveal ? h('p', { class: 'frame', lang: 'en' }, c.answer) : h('button', { class: 'ghost small', onclick: () => { reveal = true; render(false); } }, 'Cevabı göster')),
          h('div', { class: 'team-buttons' },
            cls.teams.map(t => h('button', { class: 'team-btn', style: { '--team': `var(--${t.color})` }, onclick: () => mark(t) }, `${t.name} +2`)),
            h('button', { class: 'nobody', onclick: () => mark(null) }, 'Kimse bilemedi')))));
      if (announce && c.type === 'question') ctx.sound.speak(c.prompt);
    }
    render(true);
  },
};
