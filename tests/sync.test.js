import { test, eq, ok } from './t.js';
import { createStore, memoryStorage } from '../app/core/store.js';
import { createSync, isSharedSetting } from '../app/core/sync.js';

const ROSTER = { teams: [{ id: 't1', name: 'Lions', color: 'team-1' }], students: [{ id: 's1', name: 'Ali', teamId: 't1' }] };

// Sahte Supabase: tek tablo, updated_at sayaç
function fakeCloud() {
  const rows = new Map();
  let clock = 0;
  let online = true;
  return {
    rows,
    set online(v) { online = v; },
    async upsert(records) {
      if (!online) throw new Error('offline');
      for (const r of records) rows.set(r.id, { ...r, updated_at: ++clock });
    },
    async pullSince(cursor) {
      if (!online) throw new Error('offline');
      return [...rows.values()].filter(r => r.updated_at > cursor).sort((a, b) => a.updated_at - b.updated_at);
    },
  };
}

function board(cloud, t = 1_000_000) {
  const store = createStore(memoryStorage(), () => t);
  const sync = createSync({ store, cloud, storage: memoryStorage() });
  return { store, sync };
}

test('eşitleme: iki tahta farklı şubelere puan verir, ikisi de okul liginde görünür', async () => {
  const cloud = fakeCloud();
  const A = board(cloud), B = board(cloud);
  A.store.setSetting('classList', ['11-L']); A.store.saveClass('11-L', ROSTER);
  B.store.setSetting('classList', ['12-S']); B.store.saveClass('12-S', ROSTER);
  A.store.addEvent({ classId: '11-L', targetType: 'team', targetId: 't1', points: 3 });
  B.store.addEvent({ classId: '12-S', targetType: 'team', targetId: 't1', points: 5 });
  await A.sync.flush(); await B.sync.flush();
  await A.sync.pull(); await B.sync.pull();
  for (const X of [A, B]) {
    eq(X.store.standings('11-L')[0].points, 3);
    eq(X.store.standings('12-S')[0].points, 5);
  }
});

test('eşitleme: şube listesi birleşir (son yazan kazanır değil, iki tahtanın şubeleri korunur)', async () => {
  const cloud = fakeCloud();
  const A = board(cloud), B = board(cloud);
  A.store.setSetting('classList', ['11-L']);
  B.store.setSetting('classList', ['12-S']);
  await A.sync.flush(); await B.sync.flush(); await A.sync.pull(); await B.sync.pull();
  eq(A.store.classIds().slice().sort(), ['11-L', '12-S']);
  eq(B.store.classIds().slice().sort(), ['11-L', '12-S']);
});

test('eşitleme: geri al diğer tahtada da kaldırır', async () => {
  const cloud = fakeCloud();
  const A = board(cloud), B = board(cloud);
  A.store.saveClass('11-L', ROSTER);
  A.store.addEvent({ classId: '11-L', targetType: 'team', targetId: 't1', points: 3 });
  await A.sync.flush(); await B.sync.pull();
  eq(B.store.standings('11-L')[0].points, 3);
  B.store.undo('11-L');
  await B.sync.flush(); await A.sync.pull();
  eq(A.store.standings('11-L')[0].points, 0);
});

test('eşitleme: kadro son yazanla güncellenir, yankı döngüsü yok', async () => {
  const cloud = fakeCloud();
  let t = 1_000;
  const A = { store: createStore(memoryStorage(), () => t) }; A.sync = createSync({ store: A.store, cloud, storage: memoryStorage() });
  const B = { store: createStore(memoryStorage(), () => t) }; B.sync = createSync({ store: B.store, cloud, storage: memoryStorage() });
  A.store.saveClass('11-L', ROSTER); await A.sync.flush();
  await B.sync.pull();
  t = 2_000;
  B.store.saveClass('11-L', { ...ROSTER, students: [...ROSTER.students, { id: 's2', name: 'Berk', teamId: 't1' }] });
  await B.sync.flush(); await A.sync.pull();
  eq(A.store.getClass('11-L').students.length, 2);
  eq(A.sync.pending, 0, 'gelen kayıt geri gönderilmez');
});

test('eşitleme: çevrimdışıyken kuyrukta bekler, bağlantı gelince gider', async () => {
  const cloud = fakeCloud();
  const A = board(cloud), B = board(cloud);
  A.store.saveClass('11-L', ROSTER);
  cloud.online = false;
  A.store.addEvent({ classId: '11-L', targetType: 'team', targetId: 't1', points: 1 });
  await A.sync.flush();
  ok(A.sync.pending >= 2, 'kuyrukta');
  cloud.online = true;
  await A.sync.flush(); await B.sync.pull();
  eq(A.sync.pending, 0);
  eq(B.store.standings('11-L')[0].points, 1);
});

test('eşitleme: tahtaya özel ayarlar gönderilmez', () => {
  eq([isSharedSetting('lastClass'), isSharedSetting('lessonRun:11-L'), isSharedSetting('resumeLesson:11-L')], [false, false, false]);
  eq([isSharedSetting('classList'), isSharedSetting('level:11-L'), isSharedSetting('lesson:11-L:1'), isSharedSetting('absent:11-L')], [true, true, true, true]);
});

test('eşitleme: aynı kayıt iki kez gelirse bir kez sayılır', async () => {
  const cloud = fakeCloud();
  const A = board(cloud), B = board(cloud);
  A.store.saveClass('11-L', ROSTER);
  A.store.addEvent({ classId: '11-L', targetType: 'team', targetId: 't1', points: 2 });
  await A.sync.flush();
  await B.sync.pull();
  B.sync.resetCursor();
  await B.sync.pull();
  eq(B.store.standings('11-L')[0].points, 2);
});

test('eşitleme: buluttan önce biriken yerel veri ilk girişte bir kez yüklenir', async () => {
  const cloud = fakeCloud();
  const store = createStore(memoryStorage(), () => 5_000);
  store.setSetting('classList', ['11-L']);
  store.saveClass('11-L', ROSTER);
  store.addEvent({ classId: '11-L', targetType: 'team', targetId: 't1', points: 4 });
  store.setSetting('lastClass', '11-L');
  const storage = memoryStorage();
  const sync = createSync({ store, cloud, storage });
  eq(sync.seed(), true);
  eq(sync.seed(), false, 'ikinci kez yüklenmez');
  await sync.flush();
  ok(![...cloud.rows.keys()].some(k => k.includes('lastClass')), 'tahtaya özel ayar gitmez');
  const B = board(cloud);
  await B.sync.pull();
  eq(B.store.classIds(), ['11-L']);
  eq(B.store.standings('11-L')[0].points, 4);
});
