import { test, eq, ok } from './t.js';
import { createDJ } from '../app/modules/warmup-dj/dj.js';
import { seeded } from './coach.test.js';

const unit = {
  vocab: ['rock', 'pop', 'rap', 'classical', 'folk'].map(w => ({ word: w, tr: w, img: `m/${w}.jpg`, frame: 0 })),
  dj: {
    genres: ['rock', 'pop', 'rap', 'classical', 'folk'],
    situations: [{ text: 'Before a big match', tr: 'Büyük maçtan önce' }, { text: 'Cool-down after training', tr: 'Antrenman sonrası' }, { text: 'On the bus', tr: 'Otobüste' }],
    lines: {
      A1: { choose: 'I like ___ music.', reply: ['Me too!', 'Not me.'] },
      A2: { choose: "I think ___ music is good for this because it's …", reply: ['I agree because …', 'I disagree because …'] },
      B1: { choose: "I'd prefer ___ music because …", reply: ["I see your point, but …"] },
    },
  },
};
const students = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ id, name: id, teamId: `t${(i % 2) + 1}` }));

test('dj: tur akışı seç → cevap → sonraki durum; çalma listesi birikir', () => {
  const dj = createDJ(unit, { level: 'A2', students, rng: seeded(2) });
  eq([dj.round, dj.total, dj.step], [0, 3, 'choose']);
  const first = dj.situation.text;
  eq(dj.line(), "I think ___ music is good for this because it's …");
  dj.setGenre('rock');
  eq(dj.line(), "I think rock music is good for this because it's …");
  dj.mark(true);
  eq(dj.step, 'reply');
  ok(Array.isArray(dj.line()));
  dj.mark(false);
  eq([dj.round, dj.step], [1, 'choose']);
  eq(dj.playlist, [{ situation: first, genre: 'rock', by: dj.history[0].chooser.name }]);
});

test('dj: tür seçilmeden seçen öğrenci işaretlenemez', () => {
  const dj = createDJ(unit, { level: 'A1', students, rng: seeded(3) });
  eq(dj.mark(true), false);
  eq(dj.step, 'choose');
});

test('dj: cevaplayan başka takımdan, iki kişi farklı', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const dj = createDJ(unit, { level: 'A2', students, rng: seeded(seed) });
    ok(dj.responder.teamId !== dj.chooser.teamId, `seed ${seed}`);
    ok(dj.responder.id !== dj.chooser.id);
  }
});

test('dj: son turdan sonra bitti; bir kişilik sınıfta çökmez', () => {
  const dj = createDJ(unit, { level: 'B1', students, rng: seeded(4) });
  for (let r = 0; r < 3; r++) { dj.setGenre('pop'); dj.mark(true); dj.mark(true); }
  eq([dj.done, dj.playlist.length], [true, 3]);
  const one = createDJ(unit, { level: 'A2', students: students.slice(0, 1) });
  eq(one.chooser.id, 'a');
  eq(one.responder, null);
});

test('dj: kişi değiştirme işaretsiz yeni öğrenci getirir', () => {
  const dj = createDJ(unit, { level: 'A2', students, rng: seeded(5) });
  const c = dj.chooser.id;
  dj.skipPerson();
  ok(dj.chooser.id !== c);
  eq(dj.step, 'choose');
});

test('dj: seçen öğrenci atlanınca yeni seçen gelir, atlanan sırasını kaybetmez (inceleme)', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const dj = createDJ(unit, { level: 'A2', students, rng: seeded(seed) });
    const c = dj.chooser.id;
    dj.skipPerson();
    ok(dj.chooser.id !== c, `seed ${seed}`);
    ok(dj.responder && dj.responder.id !== dj.chooser.id);
  }
});

test('dj: iki kişilik sınıfta seçen ve cevaplayan her turda yer değiştirir (inceleme)', () => {
  const dj = createDJ(unit, { level: 'A2', students: students.slice(0, 2), rng: seeded(1) });
  const first = dj.chooser.id;
  dj.setGenre('pop'); dj.mark(); dj.mark();
  ok(dj.chooser.id !== first);
});
