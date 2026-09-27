// Sarmal tekrar: bir ünitenin kelimeleri sonraki ünitelerde azalan oranla geri gelir.
// Oranlar yeni kelime sayısının üstüne eklenir: bir önceki ünite %30, iki önceki %10,
// daha eski ünitelerin her biri %5 (bu küçük paylar toplanıp rastgele farklı ünitelere dağıtılır).
import { shuffle } from '../modules/coach-says/deck.js';

export const RATES = { prev: 0.3, prev2: 0.1, older: 0.05 };

export function reviewPlan(unitNo, newCount, rng = Math.random) {
  const plan = [];
  const add = (unit, count) => { if (count > 0) plan.push({ unit, count }); };
  if (unitNo >= 2) add(unitNo - 1, Math.round(newCount * RATES.prev));
  if (unitNo >= 3) add(unitNo - 2, Math.round(newCount * RATES.prev2));
  const older = Array.from({ length: Math.max(0, unitNo - 3) }, (_, i) => i + 1);
  const pooled = Math.round(newCount * RATES.older * older.length);
  const picked = shuffle(older, rng).slice(0, pooled).sort((a, b) => b - a);
  for (const u of picked) add(u, 1);
  return plan;
}

export function pickReview(plan, unitsByNo, { rng = Math.random, exclude = [] } = {}) {
  const used = new Set(exclude.map(w => w.toLowerCase()));
  const out = [];
  for (const { unit, count } of plan) {
    const u = unitsByNo[unit];
    if (!u) continue;
    const fresh = shuffle(u.vocab, rng).filter(w => !used.has(w.word.toLowerCase())).slice(0, count);
    for (const w of fresh) {
      used.add(w.word.toLowerCase());
      out.push({ ...w, frameText: u.frames[w.frame], reviewOf: unit });
    }
  }
  return out;
}
