import { test, eq, ok } from './t.js';
import { createPicker } from '../app/modules/coach-says/picker.js';
import { seeded } from './coach.test.js';

const kids = ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, name: id.toUpperCase(), teamId: 't1' }));

test('picker: herkes bir kez seçilmeden kimse tekrar gelmez', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const p = createPicker(kids, { rng: seeded(seed) });
    const got = Array.from({ length: 5 }, () => p.pick().id);
    eq(new Set(got).size, 5, `seed ${seed}`);
  }
});

test('picker: herkes seçilince döngü baştan başlar, art arda aynı öğrenci yok', () => {
  const p = createPicker(kids, { rng: seeded(3) });
  const got = Array.from({ length: 23 }, () => p.pick().id);
  for (let i = 1; i < got.length; i++) ok(got[i] !== got[i - 1], `i=${i}`);
});

test('picker: bugün seçilmiş olanlar sona kalır', () => {
  const p = createPicker(kids, { excludeIds: ['a', 'b', 'c'], rng: seeded(4) });
  eq([p.pick().id, p.pick().id].sort(), ['d', 'e']);
  ok(['a', 'b', 'c'].includes(p.pick().id));
});

test('picker: "başka öğrenci" mevcut seçimi atlar ve sonra yine sıraya girer', () => {
  const p = createPicker(kids, { rng: seeded(6) });
  const first = p.pick();
  const other = p.skip();
  ok(other.id !== first.id);
  const rest = Array.from({ length: 4 }, () => p.pick().id);
  ok(rest.includes(first.id), 'atlanan öğrenci turda yine gelir');
});

test('picker: 0 ve 1 öğrencide çökmez', () => {
  eq(createPicker([]).pick(), null);
  const one = createPicker([kids[0]]);
  eq([one.pick().id, one.pick().id, one.skip().id], ['a', 'a', 'a']);
});
