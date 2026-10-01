import { test, eq } from './t.js';
import { keyGlosses } from '../app/modules/book-task/help.js';
import { scoreVotes } from '../app/modules/book-task/vote.js';

const unit = { vocab: [{ word: 'statistician', tr: 'istatistikçi' }, { word: 'engineer', tr: 'mühendis' }, { word: 'civil engineer', tr: 'inşaat mühendisi' }] };

test('anlam: ünite kelimesi ve maddenin anahtar kelimeleri cümledeki sırayla gelir', () => {
  const item = { keys: [{ w: 'is planning', tr: 'planlıyor' }, { w: 'to become', tr: 'olmayı' }] };
  eq(keyGlosses('Jason is planning to become a statistician.', unit, item),
    [{ w: 'is planning', tr: 'planlıyor' }, { w: 'to become', tr: 'olmayı' }, { w: 'statistician', tr: 'istatistikçi' }]);
});

test('anlam: büyük-küçük harf ve noktalama tolere edilir; uzun eşleşme kısa olanı yutar; parça kelime eşleşmez', () => {
  eq(keyGlosses('The counselor talks about Civil Engineers.', unit, {}), [{ w: 'civil engineer', tr: 'inşaat mühendisi' }]);
  eq(keyGlosses('Engineering is hard.', unit, {}), []);
  eq(keyGlosses('An engineer!', unit, {}), [{ w: 'engineer', tr: 'mühendis' }]);
});

test('oylama: doğru bilen bütün takımlar kazanır, işaretsiz takım sayılmaz', () => {
  const r = scoreVotes({ t1: true, t2: false, t3: true }, true);
  eq(r.winners, ['t1', 't3']);
  eq(r.attempts, [{ teamId: 't1', ok: true }, { teamId: 't2', ok: false }, { teamId: 't3', ok: true }]);
  eq(scoreVotes({ t1: false }, true), { winners: [], attempts: [{ teamId: 't1', ok: false }] });
  eq(scoreVotes({}, false), { winners: [], attempts: [] });
});

import { scoreMarks } from '../app/modules/book-task/vote.js';
import { lineAt, wordAt } from '../app/modules/book-task/karaoke.js';

test('kısa cevap: ✓ alan bütün takımlar kazanır, işaretsiz takım sayılmaz', () => {
  eq(scoreMarks({ t1: true, t2: false, t3: true }), { winners: ['t1', 't3'], attempts: [{ teamId: 't1', ok: true }, { teamId: 't2', ok: false }, { teamId: 't3', ok: true }] });
  eq(scoreMarks({}), { winners: [], attempts: [] });
});

const lines = [
  { s: 0, e: 2, words: [{ w: 'Theme', s: 0, e: 0.8 }, { w: 'one.', s: 0.9, e: 2 }] },
  { s: 3, e: 6, words: [{ w: 'Hi,', s: 3, e: 3.5 }, { w: "I'm", s: 3.6, e: 4 }, { w: 'Jason.', s: 4.2, e: 6 }] },
];

test('karaoke: o anki satır; satır arası boşlukta önceki satır kalır; başlamadan önce ilk satır', () => {
  eq([lineAt(lines, -1), lineAt(lines, 0), lineAt(lines, 1.5), lineAt(lines, 2.5), lineAt(lines, 3), lineAt(lines, 99)], [0, 0, 0, 0, 1, 1]);
  eq(lineAt([], 1), -1);
});

test('karaoke: o an okunan kelime; kelime arası boşlukta önceki kelime; satırdan önce -1', () => {
  const l = lines[1];
  eq([wordAt(l, 2.9), wordAt(l, 3), wordAt(l, 3.55), wordAt(l, 4.1), wordAt(l, 5), wordAt(l, 7)], [-1, 0, 0, 1, 2, 2]);
});
