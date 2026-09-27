import { h, seg } from '../../core/dom.js';
import { weekStart } from '../../core/store.js';
import { openScoreSheet } from './score-sheet.js';

const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export default {
  mount(el, ctx) {
    let type = 'team';
    let range = 'week';
    const onChange = e => render(e.detail?.targetId);
    document.addEventListener('scores-changed', onChange);
    this.unmount = () => document.removeEventListener('scores-changed', onChange);

    function render(stampId) {
      // FLIP: satırların eski yerini ölç, yeni sıraya kaydır
      const before = new Map([...el.querySelectorAll('[data-id]')].map(n => [n.dataset.id, n.getBoundingClientRect().top]));
      const rows = ctx.store.standings(ctx.classId, { type, since: range === 'week' ? weekStart(Date.now()) : 0 });
      const teams = ctx.store.getClass(ctx.classId).teams;
      const colorOf = r => (type === 'team' ? r.color : teams.find(t => t.id === r.teamId)?.color);
      const rankOf = i => rows.findIndex(r => r.points === rows[i].points) + 1; // eşit puan = eşit sıra

      el.replaceChildren(h('section', { class: 'screen league' },
        h('div', { class: 'league-head' },
          h('h1', { class: 'display' }, type === 'team' ? 'Takım ligi' : 'Bireysel lig'),
          seg([['team', 'Takım'], ['student', 'Bireysel']], type, v => { type = v; render(); }),
          seg([['week', 'Bu hafta'], ['all', 'Tüm zamanlar']], range, v => { range = v; render(); })),
        rows.length
          ? h('ol', { class: `table table-${type}` }, rows.map((r, i) => {
            const color = colorOf(r);
            return h('li', { 'data-id': r.id, class: `row${rankOf(i) === 1 && r.points > 0 ? ' leader' : ''}` },
              h('button', { class: 'row-btn', 'aria-label': `${r.name}, ${r.points} puan. Puan ver`, onclick: () => openScoreSheet(ctx, type, r) },
                h('span', { class: 'door stencil', style: { '--team': color ? `var(--${color})` : 'var(--surface-2)' } }, String(rankOf(i))),
                h('span', { class: 'name' }, r.name),
                h('span', { class: `pts stencil${r.id === stampId ? ' stamp' : ''}` }, String(r.points))));
          }))
          : h('p', { class: 'tape callout' }, 'Henüz takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur'))));

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
