import { test, eq, ok, throws } from './t.js';
import { buildDeck } from '../app/modules/coach-says/deck.js';
import { createSession } from '../app/modules/coach-says/session.js';

export function seeded(seed = 1) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

test('deck: her kelime 3 kez, art arda aynı kelime yok', () => {
  for (let n = 2; n <= 16; n++) {
    for (let seed = 1; seed <= 20; seed++) {
      const d = buildDeck(n, 3, seeded(seed));
      eq(d.length, n * 3);
      for (let k = 0; k < n; k++) eq(d.filter(x => x === k).length, 3, `n=${n} k=${k}`);
      for (let i = 1; i < d.length; i++) ok(d[i] !== d[i - 1], `n=${n} seed=${seed} i=${i}`);
    }
  }
});

test('deck: 0 ve 1 kelimede sonsuz döngü yok (RF3)', () => {
  eq(buildDeck(0), []);
  eq(buildDeck(1), [0, 0, 0]);
});

const unit = {
  frames: ['I am a ___.', 'I like ___.'],
  vocab: 'abcdefghij'.split('').map((w, i) => ({ word: w, tr: w, img: `m/${w}.jpg`, frame: i % 2 })),
  commands: [{ text: 'Coach says: jump', safe: true }, { text: 'Sit', safe: false }],
};

test('session: turlar ve uzunluklar', () => {
  const s = createSession(unit, { pick: 8, rng: seeded(3) });
  eq([s.phase, s.index, s.total], ['move', 0, 2]);
  eq(s.current().type, 'command');
  ok(s.next());
  eq(s.next(), false);
  s.setPhase('speak');
  eq([s.index, s.total], [0, 24]);
  const c = s.current();
  eq(c.type, 'word');
  eq(c.frameText, unit.frames[c.frame]);
  s.setPhase('exit');
  eq([s.index, s.total], [0, 8]);
  eq(s.prev(), false);
});

test('session: varsayılan 8 kelime, azsa hepsi', () => {
  eq(createSession(unit).words.length, 8);
  eq(createSession(unit, { pick: 99 }).words.length, 10);
});

test('session: bilinmeyen tur hata verir', () => {
  throws(() => createSession(unit).setPhase('x'));
});

const leveled = {
  frames: { A1: ['It is ___.'], A2: ['I like ___.'], B1: ['In my free time, I enjoy ___.'] },
  vocab: 'abcdefghij'.split('').map(w => ({ word: w, tr: w, img: `m/${w}.jpg`, frame: 0 })),
  commands: ['A1', 'A2', 'B1'].flatMap(L => [
    { text: `${L} one`, safe: true, level: L }, { text: `${L} two`, safe: false, level: L },
  ]),
};

test('session: seviyeye göre komut ve kalıp; çıkış bileti kendi seviyesinde', () => {
  const s = createSession(leveled, { level: 'A1', exitLevel: 'B1', rng: seeded(7) });
  eq([s.level, s.total], ['A1', 2]);
  ok([s.current().text, (s.next(), s.current().text)].every(t => t.startsWith('A1')));
  s.setPhase('speak');
  eq(s.current().frameText, 'It is ___.');
  s.setPhase('exit');
  eq(s.current().frameText, 'In my free time, I enjoy ___.');
  eq(s.levelOf('exit'), 'B1');
});

test('session: o seviyede komut yoksa tüm komutlara düşer', () => {
  const u = { ...leveled, commands: leveled.commands.filter(c => c.level !== 'B1') };
  eq(createSession(u, { level: 'B1' }).total, 4);
});

test('session: günün kelime listesi verilirse aynı kelimeler kullanılır (tarama I3)', () => {
  const s = createSession(leveled, { words: ['c', 'a', 'x'], rng: seeded(2) });
  eq(s.words.map(w => w.word), ['c', 'a']);
  eq(createSession(leveled, { words: [], pick: 3, rng: seeded(2) }).words.length, 3);
});

// Ders ders içerik: kelime, komut ve çıkış bileti her derste farklı; seviye sınıfın seviyesi
const byLesson = {
  frames: { A1: ['It is ___.'], A2: ['I like ___.'], B1: ['I enjoy ___.'], B2: ['I would love ___.'] },
  vocab: [1, 2, 3, 4].flatMap(n => ['A1', 'A2', 'B1', 'B2'].flatMap(L =>
    [1, 2, 3].map(k => ({ word: `w${n}${L}${k}`, tr: 'x', img: 'm/x.jpg', frame: 0, lesson: n, level: L })))),
  commands: [
    ...['A1', 'A2'].flatMap(L => [{ text: `${L} gen`, safe: true, level: L }, { text: `${L} trap`, safe: false, level: L }]),
    ...[1, 2].map(n => ({ text: `A1 lesson ${n}`, safe: true, level: 'A1', lesson: n })),
  ],
  exits: {
    1: { A1: [{ word: 'w1A11' }, { q: 'Q1?', a: 'A1' }] },
    2: { A1: [{ idiom: 'think outside the box', q: 'Meaning?', a: 'think creatively' }] },
  },
};

test('session: konuşma turunda o dersin, seviyeye kadar olan kelimeleri', () => {
  const s = createSession(byLesson, { lesson: 2, level: 'A2', rng: seeded(4), pick: 6 });
  ok(s.words.length && s.words.every(w => w.lesson === 2 && ['A1', 'A2'].includes(w.level)), JSON.stringify(s.words.map(w => w.word)));
  eq(s.words.length, 6);
});

test('session: dersin kelimesi azsa önceki derslerin kelimeleriyle tamamlanır', () => {
  const s = createSession(byLesson, { lesson: 3, level: 'A1', pick: 8, rng: seeded(1) });
  eq(s.words.length, 8);
  ok(s.words.filter(w => w.lesson === 3).length === 3, 'önce dersin kendi kelimeleri');
  ok(s.words.every(w => w.lesson <= 3 && w.level === 'A1'));
});

test('session: hareket turu dersin özel komutlarını da alır, başka dersinkini almaz', () => {
  const texts = s => Array.from({ length: s.total }, (_, i) => (i && s.next(), s.current().text));
  const t1 = texts(createSession(byLesson, { lesson: 1, level: 'A1', rng: seeded(2) }));
  ok(t1.includes('A1 lesson 1') && !t1.includes('A1 lesson 2'), JSON.stringify(t1));
});

test('session: çıkış bileti dersin kendi maddeleri, sınıf seviyesinde; dersler arası farklı', () => {
  const s1 = createSession(byLesson, { lesson: 1, level: 'A1', rng: seeded(2) });
  s1.setPhase('exit');
  eq(s1.total, 2);
  eq(s1.levelOf('exit'), 'A1');
  const items = [s1.current(), (s1.next(), s1.current())];
  ok(items.some(c => c.type === 'word' && c.word === 'w1A11' && c.frameText === 'It is ___.'));
  ok(items.some(c => c.type === 'prompt' && c.prompt === 'Q1?' && c.answer === 'A1'));
  const s2 = createSession(byLesson, { lesson: 2, level: 'A1', rng: seeded(2) });
  s2.setPhase('exit');
  eq(s2.current(), { type: 'prompt', kind: 'idiom', idiom: 'think outside the box', prompt: 'Meaning?', answer: 'think creatively' });
});

test('session: dersin çıkış maddesi yoksa o dersin kelimeleri kullanılır', () => {
  const s = createSession(byLesson, { lesson: 3, level: 'A2', rng: seeded(2) });
  s.setPhase('exit');
  ok(s.total > 0 && s.current().type === 'word');
});

test('session: kelimenin kendi cümlesi (say) varsa kalıp yerine o kullanılır', () => {
  const u = { ...byLesson, vocab: [{ word: 'demand', def: 'a need', say: { A1: 'There is a big ___.', B2: 'Tech jobs will be in high ___.' }, lesson: 1, level: 'A1' }], exits: undefined };
  const s = createSession(u, { lesson: 1, level: 'A1', rng: seeded(1) });
  s.setPhase('speak');
  eq(s.current().frameText, 'There is a big ___.');
  const b = createSession(u, { lesson: 1, level: 'B2', rng: seeded(1) });
  b.setPhase('speak');
  eq(b.current().frameText, 'Tech jobs will be in high ___.');
  const a2 = createSession(u, { lesson: 1, level: 'A2', rng: seeded(1) });
  a2.setPhase('speak');
  eq(a2.current().frameText, 'There is a big ___.', 'o seviyede yoksa bir alttaki');
});
