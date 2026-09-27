import { test, eq } from './t.js';
import { LEVELS, levelUp, lessonLevels, nextLevel, dayKey } from '../app/core/levels.js';

const tries = (level, ok, n) => Array.from({ length: n }, (_, i) => ({ level, ok: i < ok }));

test('levels: sıra ve üst sınır', () => {
  eq(LEVELS, ['A1', 'A2', 'B1']);
  eq([levelUp('A1', 1), levelUp('A2', 2), levelUp('B1', 1)], ['A2', 'B1', 'B1']);
});

test('levels: ders akışı L, L, L+1, L+2 (en fazla B1)', () => {
  eq(lessonLevels('A1'), { move: 'A1', speak: 'A1', interview: 'A2', exit: 'B1' });
  eq(lessonLevels('A2'), { move: 'A2', speak: 'A2', interview: 'B1', exit: 'B1' });
  eq(lessonLevels('B1'), { move: 'B1', speak: 'B1', interview: 'B1', exit: 'B1' });
});

test('levels: veri yoksa ya da 5ten az denemede seviye aynı kalır', () => {
  eq(nextLevel('A2', []), 'A2');
  eq(nextLevel('A1', tries('A2', 4, 4)), 'A1');
});

test('levels: geçilen en yüksek seviye yeni seviye olur', () => {
  eq(nextLevel('A1', [...tries('A1', 8, 10), ...tries('A2', 7, 10)]), 'A2');
  eq(nextLevel('A1', [...tries('A1', 8, 10), ...tries('A2', 6, 10)]), 'A1');
  eq(nextLevel('A2', [...tries('A2', 6, 10), ...tries('B1', 2, 5)]), 'A2');
  eq(nextLevel('A2', tries('B1', 9, 10)), 'B1');
  eq(nextLevel('B1', tries('B1', 10, 10)), 'B1');
});

test('levels: mevcut seviyede %40 altı başarı bir alta indirir', () => {
  eq(nextLevel('A2', tries('A2', 1, 5)), 'A1');
  eq(nextLevel('A1', tries('A1', 0, 6)), 'A1');
  eq(nextLevel('A2', [...tries('A2', 1, 5), ...tries('A1', 9, 10)]), 'A1');
});

test('levels: gün anahtarı yerel tarih', () => {
  eq(dayKey(new Date(2026, 8, 27, 23, 59).getTime()), '2026-09-27');
  eq(dayKey(new Date(2026, 0, 5, 0, 1).getTime()), '2026-01-05');
});

test('levels: bir derste en fazla bir seviye yükselir (inceleme I2)', () => {
  eq(nextLevel('A1', tries('B1', 5, 5)), 'A2');
  eq(nextLevel('A1', [...tries('A1', 9, 10), ...tries('A2', 9, 10), ...tries('B1', 9, 10)]), 'A2');
});
