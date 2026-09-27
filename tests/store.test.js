import { test, eq, ok, throws } from './t.js';
import { createStore, memoryStorage, weekStart } from '../app/core/store.js';

const ROSTER = {
  teams: [{ id: 't1', name: 'Lions', color: 'team-1' }, { id: 't2', name: 'Eagles', color: 'team-2' }],
  students: [{ id: 's1', name: 'Ali', teamId: 't1' }, { id: 's2', name: 'Berk', teamId: 't2' }],
};
function setup(now = () => 1_000_000, storage = memoryStorage()) {
  const s = createStore(storage, now);
  s.saveClass('11-A', structuredClone(ROSTER));
  return s;
}
const team = (s, id) => s.standings('11-A').find(r => r.id === id).points;

test('store: puanlar olaylardan toplanır ve sıralanır', () => {
  const s = setup();
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't2', points: 3 });
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 1 });
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't2', points: -1 });
  eq(s.standings('11-A').map(r => [r.name, r.points]), [['Eagles', 2], ['Lions', 1]]);
});

test('store: eşit puanda ada göre sıralar', () => {
  eq(setup().standings('11-A').map(r => r.name), ['Eagles', 'Lions']);
});

test('store: takım ve bireysel lig ayrı', () => {
  const s = setup();
  s.addEvent({ classId: '11-A', targetType: 'student', targetId: 's1', points: 1 });
  eq(team(s, 't1'), 0);
  eq(s.standings('11-A', { type: 'student' })[0], { id: 's1', name: 'Ali', teamId: 't1', points: 1 });
});

test('store: geri al yalnızca o sınıfın son olayını siler (RF4)', () => {
  const s = setup();
  s.saveClass('11-B', { teams: [{ id: 't1', name: 'X', color: 'team-1' }], students: [] });
  eq(s.undo('11-A'), null);
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 1 });
  s.addEvent({ classId: '11-B', targetType: 'team', targetId: 't1', points: 5 });
  eq(s.undo('11-A').points, 1);
  eq(s.undo('11-A'), null);
  eq(s.standings('11-B')[0].points, 5);
});

test('store: haftalık filtre', () => {
  let t = new Date(2026, 8, 20, 10).getTime(); // Pazar, geçen hafta
  const s = setup(() => t);
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 5 });
  t = new Date(2026, 8, 22, 10).getTime(); // Salı
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 2 });
  eq(s.standings('11-A', { since: weekStart(t) }).find(r => r.id === 't1').points, 2);
  eq(team(s, 't1'), 7);
});

test('weekStart: Pazartesi 00:00', () => {
  const d = new Date(weekStart(new Date(2026, 8, 27, 15).getTime()));
  eq([d.getDate(), d.getHours(), d.getMinutes()], [21, 0, 0]);
});

test('store: veri depolamaya yazılır ve yeniden okunur', () => {
  const mem = memoryStorage();
  const a = setup(undefined, mem);
  a.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 4 });
  a.setSetting('lastClass', '11-A');
  const b = createStore(mem);
  eq(team(b, 't1'), 4);
  eq(b.getSetting('lastClass'), '11-A');
  eq(b.getSetting('yok', 7), 7);
});

test('store: yedek dışa/içe aktarma aynı ligi verir', () => {
  const a = setup();
  a.addEvent({ classId: '11-A', targetType: 'team', targetId: 't2', points: 3 });
  const b = createStore(memoryStorage());
  b.import(a.export());
  eq(b.standings('11-A'), a.standings('11-A'));
});

test('store: bozuk yedek reddedilir, mevcut veri korunur (RF2)', () => {
  const s = setup();
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 2 });
  throws(() => s.import('bu json değil'));
  throws(() => s.import('{"foo":1}'));
  throws(() => s.import('{"version":1,"classes":{},"events":[{"points":"çok"}]}'));
  eq(team(s, 't1'), 2);
});

test('store: depolama kapalıysa bellekte çalışır (RF1)', () => {
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const s = createStore(blocked);
  eq(s.persistent, false);
  s.saveClass('11-A', structuredClone(ROSTER));
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 1 });
  eq(team(s, 't1'), 1);
});

test('store: depolama dolunca persistent false olur, işlem sürer (RF1)', () => {
  const full = { getItem: () => null, setItem(k) { if (k !== 'okul.probe') throw new Error('QuotaExceeded'); } };
  const s = createStore(full);
  eq(s.persistent, true);
  s.saveClass('11-A', structuredClone(ROSTER));
  eq(s.persistent, false);
  s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 1 });
  eq(team(s, 't1'), 1);
});

test('store: bozuk kayıtlı veride boş başlar', () => {
  const mem = memoryStorage();
  mem.setItem('okul.v1', '{bozuk');
  const s = createStore(mem);
  eq(s.getClass('11-A'), { teams: [], students: [] });
  ok(s.persistent);
});
