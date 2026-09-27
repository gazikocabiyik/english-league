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

test('store: localStorage erişimi hata fırlatırsa bellekte çalışır (final C1)', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { get() { throw new Error('SecurityError'); }, configurable: true });
  try {
    const s = createStore();
    eq(s.persistent, false);
    s.setSetting('lastClass', '11-L');
    eq(s.getSetting('lastClass'), '11-L');
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc); else delete globalThis.localStorage;
  }
});

test('store: iç yapısı bozuk yedek reddedilir ve kayıttan da yüklenmez (final I1)', () => {
  const s = setup();
  throws(() => s.import('{"version":1,"classes":{},"events":[],"settings":null}'));
  throws(() => s.import('{"version":1,"classes":{"11-L":{}},"events":[],"settings":{}}'));
  throws(() => s.import('{"version":1,"classes":{},"events":[],"settings":{"classList":"11-L"}}'));
  eq(s.getClass('11-A').teams.length, 2);
  const mem = memoryStorage();
  mem.setItem('okul.v1', '{"version":1,"classes":{"11-L":{}},"events":[],"settings":null}');
  const b = createStore(mem);
  eq([b.getClass('11-L'), b.getSetting('x', 1)], [{ teams: [], students: [] }, 1]);
});

test('store: deneme kaydı ve sınıf filtresi', () => {
  const s = setup();
  s.addAttempt({ classId: '11-A', level: 'A1', ok: true, activity: 'speak' });
  s.addAttempt({ classId: '11-B', level: 'A1', ok: false, activity: 'speak' });
  eq(s.attemptsOf('11-A').map(a => [a.level, a.ok, a.activity]), [['A1', true, 'speak']]);
});

test('store: geri al, puana bağlı doğru kaydını da siler', () => {
  const s = setup();
  s.addAttempt({ classId: '11-A', level: 'A1', ok: false, activity: 'speak' });
  const e = s.addEvent({ classId: '11-A', targetType: 'team', targetId: 't1', points: 1 });
  s.addAttempt({ classId: '11-A', level: 'A1', ok: true, activity: 'speak', eventId: e.id });
  s.undo('11-A');
  eq(s.attemptsOf('11-A').map(a => a.ok), [false]);
});

test('store: yeni şube A1; gün değişince önceki dersin sonuçlarıyla seviye güncellenir', () => {
  let t = new Date(2026, 8, 28, 9).getTime();
  const s = setup(() => t);
  eq(s.ensureDailyLevel('11-A'), 'A1');
  for (let i = 0; i < 10; i++) s.addAttempt({ classId: '11-A', level: 'A1', ok: i < 9, activity: 'speak' });
  for (let i = 0; i < 10; i++) s.addAttempt({ classId: '11-A', level: 'A2', ok: i < 8, activity: 'interview' });
  eq(s.ensureDailyLevel('11-A'), 'A1', 'aynı gün değişmez');
  t = new Date(2026, 8, 30, 9).getTime();
  eq(s.ensureDailyLevel('11-A'), 'A2');
  eq(s.classLevel('11-A'), 'A2');
  eq(s.ensureDailyLevel('11-A'), 'A2', 'eski denemeler ikinci kez sayılmaz');
});

test('store: öğretmen seviyeyi elle değiştirebilir', () => {
  const s = setup();
  s.setClassLevel('11-A', 'B1');
  eq(s.classLevel('11-A'), 'B1');
});

test('store: denemesiz eski yedek yüklenir, yeni yedek denemeleri taşır', () => {
  const s = setup();
  s.import('{"version":1,"classes":{},"events":[],"settings":{}}');
  eq(s.attemptsOf('11-A'), []);
  s.addAttempt({ classId: '11-A', level: 'A2', ok: true, activity: 'speak' });
  const b = createStore(memoryStorage());
  b.import(s.export());
  eq(b.attemptsOf('11-A').length, 1);
  throws(() => b.import('{"version":1,"classes":{},"events":[],"attempts":"x"}'));
});
