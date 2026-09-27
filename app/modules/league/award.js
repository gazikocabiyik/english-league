import { toast } from '../../core/dom.js';

let last = { key: '', t: 0 };

// Dokunmatik tahtalar bazen tek dokunuşu iki kez iletir; aynı hedefe 500 ms içindeki ikinci puanı yok say.
export function award(ctx, targetType, target, points, source, groupId) {
  const key = `${targetType}:${target.id}:${points}`;
  const t = Date.now();
  if (key === last.key && t - last.t < 500) return null;
  last = { key, t };
  const e = ctx.store.addEvent({ classId: ctx.classId, targetType, targetId: target.id, points, reason: `${target.name} · ${source}`, groupId });
  toast(`${target.name} ${points > 0 ? '+' : ''}${points}`);
  document.dispatchEvent(new CustomEvent('scores-changed', { detail: { targetId: target.id } }));
  return e; // olay: seviye denemesi buna bağlanır (geri al ikisini birlikte siler)
}
