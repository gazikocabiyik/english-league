import { test, eq, ok } from './t.js';
import { reviewPlan, pickReview } from '../app/core/spiral.js';
import { buildMixedDeck } from '../app/modules/coach-says/deck.js';
import { createSession } from '../app/modules/coach-says/session.js';
import { seeded } from './coach.test.js';

const total = plan => plan.reduce((s, p) => s + p.count, 0);

test('spiral: 1. ünitede tekrar yok', () => eq(reviewPlan(1, 8), []));

test('spiral: 2. ünite önceki ünitenin %30u kadar tekrar ekler', () => {
  eq(reviewPlan(2, 8), [{ unit: 1, count: 2 }]);
  eq(reviewPlan(2, 16), [{ unit: 1, count: 5 }]);
});

test('spiral: 3. ünite %30 + %10', () => eq(reviewPlan(3, 8), [{ unit: 2, count: 2 }, { unit: 1, count: 1 }]));

test('spiral: daha eski ünitelerin %5 payları toplanıp farklı ünitelere dağılır', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const plan = reviewPlan(10, 8, seeded(seed));
    eq(plan.slice(0, 2), [{ unit: 9, count: 2 }, { unit: 8, count: 1 }]);
    const older = plan.slice(2);
    eq(total(older), 3, 'eski toplam (8 × %5 × 7 = 2.8)');
    ok(older.every(p => p.unit >= 1 && p.unit <= 7), 'eski ünite aralığı');
    eq(new Set(older.map(p => p.unit)).size, older.length, 'ünite tekrarı yok');
  }
});

const unit = (n, words) => ({ unit: n, frames: ['I like ___.'], vocab: words.map(w => ({ word: w, tr: w, img: `m/${w}.jpg`, frame: 0 })) });

test('spiral: tekrar kelimeleri kaynak ünite etiketiyle ve kalıbıyla gelir', () => {
  const r = pickReview([{ unit: 1, count: 2 }], { 1: unit(1, ['a', 'b', 'c']) }, { rng: seeded(2) });
  eq(r.length, 2);
  ok(r.every(w => w.reviewOf === 1 && w.frameText === 'I like ___.'));
  eq(new Set(r.map(w => w.word)).size, 2);
});

test('spiral: eksik ünite atlanır, mevcut ünitenin kelimesi tekrar olarak gelmez', () => {
  const r = pickReview([{ unit: 2, count: 3 }, { unit: 1, count: 2 }], { 1: unit(1, ['coach', 'pilot']) }, { exclude: ['coach'] });
  eq(r.map(w => w.word), ['pilot']);
});

test('deck: karma destede yeni kelime 3, tekrar kelimesi 1 kez; art arda aynı kart yok', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const d = buildMixedDeck(8, 3, seeded(seed));
    eq(d.length, 27);
    for (let k = 0; k < 8; k++) eq(d.filter(x => x === k).length, 3);
    for (let k = 8; k < 11; k++) eq(d.filter(x => x === k).length, 1);
    for (let i = 1; i < d.length; i++) ok(d[i] !== d[i - 1]);
  }
  eq(buildMixedDeck(0, 2, seeded(1)).sort(), [0, 1]);
});

test('session: konuşma turu tekrar kartlarını içerir, çıkış bileti içermez', () => {
  const u = unit(2, 'abcdefghij'.split(''));
  u.commands = [{ text: 'Coach says: jump', safe: true }, { text: 'Sit', safe: false }];
  const review = pickReview([{ unit: 1, count: 2 }], { 1: unit(1, ['x', 'y', 'z']) }, { rng: seeded(4) });
  const s = createSession(u, { pick: 8, rng: seeded(5), review });
  s.setPhase('speak');
  eq(s.total, 26);
  let seen = 0;
  for (let i = 0; i < s.total; i++) { if (s.current().reviewOf === 1) seen++; s.next(); }
  eq(seen, 2);
  s.setPhase('exit');
  eq(s.total, 8);
});
