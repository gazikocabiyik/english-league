import { test, eq, throws } from './t.js';
import { makeClassId, sortClassIds } from '../app/core/classes.js';

test('classes: şube adı büyük harfe çevrilir, boşluk temizlenir', () => {
  eq(makeClassId(11, ' l '), '11-L');
  eq(makeClassId(12, 'spor'), '12-SPOR');
  eq(makeClassId(11, 'i'), '11-İ');
});

test('classes: geçersiz sınıf ve şube reddedilir', () => {
  throws(() => makeClassId(10, 'A'));
  throws(() => makeClassId(11, ''));
  throws(() => makeClassId(11, 'A-B'));
  throws(() => makeClassId(11, 'ABCDEF'));
});

test('classes: sınıfa sonra şubeye göre sıralanır', () => {
  eq(sortClassIds(['12-S', '11-L', '12-A', '11-B']), ['11-B', '11-L', '12-A', '12-S']);
});
