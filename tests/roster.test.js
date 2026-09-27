import { test, eq, ok } from './t.js';
import { buildRoster } from '../app/modules/league/roster.js';
import { createStore, memoryStorage } from '../app/core/store.js';

const ids = () => { let n = 0; return () => `id${++n}`; };

test('roster: boş satır, boşluk ve tekrar temizlenir, takımlara sırayla dağılır', () => {
  const r = buildRoster('Ali\nBerk\nCan\n\n  Deniz  \nAli', 2, undefined, ids());
  eq(r.teams, [{ id: 't1', name: 'Team A', color: 'team-1' }, { id: 't2', name: 'Team B', color: 'team-2' }]);
  eq(r.students.map(s => [s.name, s.teamId]), [['Ali', 't1'], ['Berk', 't2'], ['Can', 't1'], ['Deniz', 't2']]);
});

test('roster: aynı isim id ve takımını korur, silinen öğrenci çıkar (RF5)', () => {
  const prev = buildRoster('Ali\nBerk\nCan', 2, undefined, ids());
  const next = buildRoster('Can\nAli\nEce', 2, prev, ids());
  eq(next.students.find(s => s.name === 'Ali'), prev.students.find(s => s.name === 'Ali'));
  ok(!next.students.some(s => s.name === 'Berk'));
});

test('roster: takım sayısı azalınca boşta kalan öğrenci mevcut takıma geçer (RF5)', () => {
  const prev = buildRoster('Ali\nBerk\nCan', 3, undefined, ids());
  eq(prev.students[2].teamId, 't3');
  const next = buildRoster('Ali\nBerk\nCan', 2, prev, ids());
  ok(next.students.every(s => ['t1', 't2'].includes(s.teamId)));
});

test('roster: takım adları korunur', () => {
  const prev = buildRoster('Ali', 2, undefined, ids());
  prev.teams[0].name = 'Lions';
  eq(buildRoster('Ali', 2, prev, ids()).teams[0].name, 'Lions');
});

test('roster + store: silinen öğrenci bireysel ligden düşer, kalanın puanı korunur (RF5)', () => {
  const s = createStore(memoryStorage());
  const r1 = buildRoster('Ali\nBerk', 2, undefined, ids());
  s.saveClass('12-A', r1);
  for (const st of r1.students) s.addEvent({ classId: '12-A', targetType: 'student', targetId: st.id, points: 2 });
  s.saveClass('12-A', buildRoster('Ali', 2, s.getClass('12-A'), ids()));
  eq(s.standings('12-A', { type: 'student' }).map(r => [r.name, r.points]), [['Ali', 2]]);
});

import { balanceTeams, moveStudent } from '../app/modules/league/roster.js';

const T = [{ id: 't1' }, { id: 't2' }, { id: 't3' }];
const S = (spec) => spec.map(([id, teamId]) => ({ id, name: id, teamId }));

test('dengele: gelenler gruplara en fazla 1 fark olacak şekilde, en az taşımayla dağılır', () => {
  const st = S([['a', 't1'], ['b', 't1'], ['c', 't1'], ['d', 't1'], ['e', 't2'], ['f', 't3']]);
  const out = balanceTeams(st, T, ['f']);
  const present = out.filter(s => s.id !== 'f');
  const sizes = T.map(t => present.filter(s => s.teamId === t.id).length);
  ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `boyutlar ${sizes}`);
  eq(out.filter((s, i) => s.teamId !== st[i].teamId).length, 2, 'en az taşıma');
  eq(out.find(s => s.id === 'f').teamId, 't3', 'gelmeyen öğrenci yerinde kalır');
});

test('dengele: zaten dengeliyse kimse taşınmaz; takımsız öğrenci en küçük gruba girer', () => {
  const st = S([['a', 't1'], ['b', 't2'], ['c', 't3']]);
  eq(balanceTeams(st, T, []), st);
  eq(balanceTeams([...st, { id: 'x', name: 'x', teamId: null }], T, []).find(s => s.id === 'x').teamId !== null, true);
});

test('grup değiştir: öğrenci sıradaki gruba geçer, sondan başa döner', () => {
  const st = S([['a', 't3']]);
  eq(moveStudent(st, T, 'a')[0].teamId, 't1');
  eq(moveStudent(S([['a', 't1']]), T, 'a')[0].teamId, 't2');
});

test('dengele: grubu geçersiz öğrenci (gelmeyen de olsa) geçerli bir gruba alınır; yeni grup boş kalmaz (inceleme)', () => {
  const st = S([['a', 't1'], ['b', 't2'], ['c', 'tX'], ['d', 't1'], ['e', 't2'], ['f', 't1']]);
  const out = balanceTeams(st, T, ['c']);
  ok(['t1', 't2', 't3'].includes(out.find(s => s.id === 'c').teamId), 'gelmeyen de görünür bir grupta');
  ok(out.some(s => s.teamId === 't3' && s.id !== 'c'), 'yeni grup (t3) boş kalmadı');
});
