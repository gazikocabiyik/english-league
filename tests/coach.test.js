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
