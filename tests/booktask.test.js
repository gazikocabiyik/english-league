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
