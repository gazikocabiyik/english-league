import { h, icon, lockKey } from '../../core/dom.js';
import { loadIndex } from '../../core/content.js';
import { games } from '../registry.js';
import { weekStart } from '../../core/store.js';
import { levelUp } from '../../core/levels.js';

const GAME_ICONS = { 'coach-says': 'person-simple-run', 'mock-interview': 'microphone-stage' };

export default {
  async mount(el, ctx) {
    const onChange = () => ctx.rerender(); // geri al sonrası haftalık şerit güncellensin
    document.addEventListener('scores-changed', onChange);
    this.unmount = () => document.removeEventListener('scores-changed', onChange);
    const cls = ctx.store.getClass(ctx.classId);
    const level = ctx.store.ensureDailyLevel(ctx.classId);
    const index = await loadIndex();
    const available = index[ctx.grade] ?? [];
    const pickUnit = n => { ctx.store.setSetting(`unit:${ctx.classId}`, n); ctx.rerender(); };

    const week = ctx.store.standings(ctx.classId, { since: weekStart(Date.now()) });
    // Şubenin bu haftaki okul sırası (öğrenci başına ortalama)
    const school = ctx.store.schoolStandings({ type: 'class', since: weekStart(Date.now()) });
    const mine = school.findIndex(r => r.id === ctx.classId);
    const schoolRank = school.length > 1 && mine >= 0 ? school.findIndex(r => r.points === school[mine].points) + 1 : null;
    el.append(h('section', { class: 'screen panel' },
      h('div', { class: 'panel-head' },
        h('div', { class: 'title-row' },
          h('h1', { class: 'display' }, ctx.classId),
          h('span', { class: 'tape level-badge' }, level === 'B1' ? 'Seviye B1 · en üst seviye' : `Seviye ${level} · hedef ${levelUp(level)}`)),
        h('div', { class: 'unit-row', role: 'group', 'aria-label': 'Ünite' },
          Array.from({ length: 10 }, (_, i) => i + 1).map(n => h('button', {
            class: `unit-btn${n === ctx.unit ? ' is-active' : ''}`,
            disabled: !available.includes(n),
            onclick: () => pickUnit(n),
          }, String(n))))),
      cls.teams.length ? null : h('p', { class: 'tape callout' }, 'Bu sınıfta henüz takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur')),
      h('div', { class: 'tiles' },
        games.map((g, i) => h('button', { class: `tile game${i === 0 ? ' primary' : ''}`, onclick: () => ctx.go(`#/game/${g.id}`) }, icon(GAME_ICONS[g.id] ?? 'play'), h('span', { lang: 'en' }, g.title.toLocaleUpperCase('en')))),
        h('button', { class: 'tile', onclick: () => ctx.go('#/league') }, icon('trophy'), 'Lig'),
        h('button', { class: 'tile', onclick: () => ctx.go('#/setup') }, icon('users-three'), 'Takımlar')),
      week.length ? h('button', { class: 'mini-league', 'aria-label': 'Bu haftanın takım ligi', onclick: () => ctx.go('#/league') },
        h('span', { class: 'mini-title' }, 'Bu hafta', schoolRank ? h('span', { class: 'tape school-rank' }, `Okulda ${schoolRank}. sıra`) : null),
        week.map(t => h('span', { class: 'mini-door', style: { '--team': `var(--${t.color})` } },
          lockKey(),
          h('span', { class: 'stencil' }, String(t.points)), h('span', { class: 'mini-name' }, t.name)))) : null));
  },
};
