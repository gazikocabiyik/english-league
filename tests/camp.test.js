import { test, eq } from './t.js';
import { coverage } from '../app/modules/pre-season/coverage.js';

const fns = Array.from({ length: 20 }, (_, i) => ({ id: `f${i}` }));

test('ön kamp: önceki ünitelerin payı ve bu üniteyle ulaşılan pay (tekrarlar bir kez sayılır)', () => {
  eq(coverage(fns, [], ['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6']), { before: 0, after: 35, added: 35 });
  eq(coverage(fns, [['f0', 'f1'], ['f1', 'f2']], ['f2', 'f3']), { before: 15, after: 20, added: 5 });
});

test('ön kamp: listede olmayan işlev sayılmaz, boş liste sıfır verir', () => {
  eq(coverage(fns, [], ['f0', 'yok']), { before: 0, after: 5, added: 5 });
  eq(coverage([], [], ['f0']), { before: 0, after: 0, added: 0 });
});
