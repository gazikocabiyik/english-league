import { h } from '../../core/dom.js';
import { award } from './award.js';

export function openScoreSheet(ctx, targetType, target) {
  const close = () => sheet.remove();
  const btn = (points, cls) => h('button', {
    class: `pts-btn ${cls}`,
    onclick: () => { award(ctx, targetType, target, points, 'Lig'); close(); },
  }, `${points > 0 ? '+' : '−'}${Math.abs(points)}`);
  const sheet = h('div', { class: 'sheet-backdrop', onclick: e => { if (e.target === sheet) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': `${target.name} için puan` },
      h('p', { class: 'sheet-title' }, target.name),
      h('div', { class: 'sheet-btns' }, btn(1, 'plus'), btn(3, 'plus'), btn(-1, 'minus')),
      h('button', { class: 'ghost', onclick: close }, 'Vazgeç')));
  document.body.append(sheet);
}
