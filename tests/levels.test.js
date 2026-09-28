import { test, eq } from './t.js';
import { LEVELS, levelUp, lessonLevels, levelAfterLesson, dayKey } from '../app/core/levels.js';

const tries = (level, ok, n) => Array.from({ length: n }, (_, i) => ({ level, ok: i < ok }));

test('levels: sıra A1 → A2 → B1 → B2, üst sınır B2', () => {
  eq(LEVELS, ['A1', 'A2', 'B1', 'B2']);
  eq([levelUp('A1'), levelUp('A2'), levelUp('B1'), levelUp('B2')], ['A2', 'B1', 'B2', 'B2']);
});

test('levels: dersin bütün etkinlikleri sınıfın seviyesinde (kaydırma yok)', () => {
  eq(lessonLevels('A1'), { move: 'A1', speak: 'A1', interview: 'A1', exit: 'A1' });
  eq(lessonLevels('B2'), { move: 'B2', speak: 'B2', interview: 'B2', exit: 'B2' });
});

test('levels: derste sınıf doğruluğu %80 ve üstü → sonraki ders bir üst seviye', () => {
  eq(levelAfterLesson('A1', tries('A1', 8, 10)), 'A2');
  eq(levelAfterLesson('A2', tries('A2', 17, 20)), 'B1');
  eq(levelAfterLesson('B1', tries('B1', 10, 10)), 'B2');
  eq(levelAfterLesson('B2', tries('B2', 10, 10)), 'B2', 'tavan');
});

test('levels: %80 altı aynı seviyede kalır, düşürme yok', () => {
  eq(levelAfterLesson('A1', tries('A1', 79, 100)), 'A1');
  eq(levelAfterLesson('A2', tries('A2', 0, 10)), 'A2');
});

test('levels: 8 cevaptan azsa karar verilmez', () => {
  eq(levelAfterLesson('A1', tries('A1', 7, 7)), 'A1');
  eq(levelAfterLesson('A1', []), 'A1');
});

test('levels: gün anahtarı yerel tarih', () => {
  eq(dayKey(new Date(2026, 8, 27, 23, 59).getTime()), '2026-09-27');
});
