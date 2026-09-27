import { h, seg } from '../../core/dom.js';
import { weekStart } from '../../core/store.js';
import { openScoreSheet } from './score-sheet.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const TEAM_COLORS = ['team-1', 'team-2', 'team-3', 'team-4'];

export default {
  mount(el, ctx) {
    let scope = 'class';     // şube | okul
    let type = 'team';       // şube: team/student · okul: class/team/student
    let range = 'week';
    let grade = null;        // okul filtresi: null | 11 | 12
    const onChange = e => render(e.detail?.targetId);
    document.addEventListener('scores-changed', onChange);
    this.unmount = () => document.removeEventListener('scores-changed', onChange);

    function rows() {
      const since = range === 'week' ? weekStart(Date.now()) : 0;
      if (scope === 'class') return ctx.store.standings(ctx.classId, { type, since });
      return ctx.store.schoolStandings({ type, grade, since });
    }

    function colorOf(r, i) {
      if (scope === 'school' && type === 'class') return TEAM_COLORS[i % TEAM_COLORS.length];
      if (type === 'team') return r.color;
      const cls = ctx.store.getClass(r.classId ?? ctx.classId);
      return cls.teams.find(t => t.id === r.teamId)?.color;
    }

    function title() {
      if (scope === 'class') return type === 'team' ? 'Takım ligi' : 'Bireysel lig';
      return { class: 'Okul · Şubeler', team: 'Okul · Takımlar', student: 'Okul · Öğrenciler' }[type];
    }

    function render(stampId) {
      // FLIP: satırların eski yerini ölç, yeni sıraya kaydır
      const before = new Map([...el.querySelectorAll('[data-id]')].map(n => [n.dataset.id, n.getBoundingClientRect().top]));
      const list = rows();
      const rankOf = i => list.findIndex(r => r.points === list[i].points) + 1; // eşit puan = eşit sıra
      const key = r => `${r.classId ?? ''}:${r.id}`;
      const interactive = scope === 'class';

      el.replaceChildren(h('section', { class: `screen league scope-${scope}` },
        h('div', { class: 'league-head' },
          h('h1', { class: 'display' }, title()),
          seg([['class', `Şube ${ctx.classId}`], ['school', 'Okul']], scope, v => { scope = v; type = v === 'class' ? 'team' : 'class'; render(); }),
          scope === 'class'
            ? seg([['team', 'Takım'], ['student', 'Bireysel']], type, v => { type = v; render(); })
            : seg([['class', 'Şubeler'], ['team', 'Takımlar'], ['student', 'Öğrenciler']], type, v => { type = v; render(); }),
          scope === 'school' ? seg([[null, 'Hepsi'], [11, '11'], [12, '12']], grade, v => { grade = v; render(); }) : null,
          seg([['week', 'Bu hafta'], ['all', 'Tüm zamanlar']], range, v => { range = v; render(); })),
        list.length
          ? h('ol', { class: `table table-${type}` }, list.map((r, i) => {
            const color = colorOf(r, i);
            const inner = [
              h('span', { class: 'door stencil', style: { '--team': color ? `var(--${color})` : 'var(--surface-2)' } }, String(rankOf(i))),
              h('span', { class: 'name' }, r.name,
                scope === 'school' && type !== 'class' ? h('span', { class: 'class-tag' }, ` · ${r.classId}`) : null,
                scope === 'school' && type === 'class' ? h('span', { class: 'class-tag' }, ` · ${r.students} öğrenci`) : null),
              h('span', { class: `pts stencil${r.id === stampId ? ' stamp' : ''}` }, String(r.points).replace('.', ','),
                scope === 'school' && type === 'class' ? h('small', { class: 'per' }, 'öğr. başına') : null),
            ];
            return h('li', { 'data-id': key(r), class: `row${rankOf(i) <= 3 && r.points > 0 && scope === 'school' ? ' podium' : ''}${rankOf(i) === 1 && r.points > 0 ? ' leader' : ''}` },
              interactive
                ? h('button', { class: 'row-btn', 'aria-label': `${r.name}, ${r.points} puan. Puan ver`, onclick: () => openScoreSheet(ctx, type, r) }, inner)
                : h('div', { class: 'row-btn is-static' }, inner));
          }))
          : h('p', { class: 'tape callout' }, scope === 'class' ? 'Henüz takım yok. ' : 'Henüz şube yok. ', h('a', { href: scope === 'class' ? '#/setup' : '#/' }, scope === 'class' ? 'Takımları kur' : 'Şube ekle'))));

      if (reduceMotion()) return;
      for (const n of el.querySelectorAll('[data-id]')) {
        const old = before.get(n.dataset.id);
        const dy = old === undefined ? 0 : old - n.getBoundingClientRect().top;
        if (dy) n.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    }
    render();
  },
};
