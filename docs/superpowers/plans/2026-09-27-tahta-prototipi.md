# Tahta Prototipi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akıllı tahtada çalışan, derleme gerektirmeyen bir sınıf ligi uygulaması: sınıf seçimi, takım/öğrenci kurulumu, lig tablosu, zamanlayıcı ve 3 turlu Coach Says oyunu.

**Architecture:** Düz HTML + CSS + ES modülleri, `app/` altında statik site. Tüm veri `core/store.js` üzerinden geçer (şimdilik `localStorage`), ekranlar `core/router.js` ile hash üzerinden açılır, oyunlar `modules/registry.js`'e kayıtlı modüllerdir. Saf mantık (store, içerik doğrulama, deste, oturum, zamanlayıcı, kadro) DOM'dan ayrıdır ve Node ile test edilir.

**Tech Stack:** Vanilla JS (ES2022 modülleri), CSS custom properties, Web Speech API, Web Audio API, Node 26 (sadece testler için; bağımlılık yok), Python 3 stdlib (fotoğraf indirme betiği), Phosphor ikonları (SVG).

**Spec:** `docs/superpowers/specs/2026-09-27-tahta-prototipi-design.md`

## Global Constraints

- Derleme/kurulum adımı yok; `npm install` yok, framework yok. Kök `package.json` sadece `{"type":"module"}` içerir.
- Sınıflar sabit: `11-A`, `11-B`, `11-C`, `12-A`, `12-B`. Sınıf başına 2–4 takım.
- Kalıcı veri anahtarı `okul.v1`; puanlar toplam olarak değil `events[]` olarak saklanır.
- `store.js` arayüzü: `addEvent`, `undo`, `standings`, `getClass`, `saveClass`, `export`, `import` (+ `getSetting`, `setSetting`, `persistent`).
- Oyun modülü arayüzü: `{ id, title, mount(el, ctx), unmount() }`.
- Gövde metni ≥ 32px, oyun kelimesi ≥ 96px; hedef ekran 1920×1080 dokunmatik.
- Yasak: mor-mavi gradyan, glassmorphism, emoji, özdeş kart ızgarası, süs animasyonu, yapay zekâ üretimi görsel.
- Görseller: lisansı serbest gerçek fotoğraf, `app/content/media/`, kaynak `app/content/media/CREDITS.md`.
- İkonlar: yalnız Phosphor (bold), `app/assets/icons/` içinde SVG, CSS mask ile boyanır.
- Sesli okuma: `en-US`, hız 0.85 (A1–A2 için yavaş).
- Kitap PDF'leri git'e girmez (`.gitignore` içinde `*.pdf`).
- Arayüz dili Türkçe (öğretmen düğmeleri), oyun içeriği İngilizce.

## Review Focus

1. Tarayıcı depolaması kapalı ya da dolu → uygulama bellekte çalışmaya devam eder, üstte "puanlar kaydedilmiyor" uyarısı görünür, hiçbir puan işlemi hata fırlatmaz. (Task 1 testleri)
2. Yanlış/bozuk dosya "Yedeği yükle" ile seçilir → reddedilir, açık Türkçe hata, mevcut lig aynen kalır. (Task 1 testi)
3. Eksik alanlı, 0–1 kelimeli ya da tuzaksız ünite dosyası → oyun açılmaz ama hata listesi gösterilir; deste üretimi sonsuz döngüye girmez. (Task 2 testleri)
4. "Geri al" hiç olay yokken ya da başka sınıfta basılır → hiçbir şey bozulmaz, yalnız aktif sınıfın son olayı silinir. (Task 1 testi)
5. Kadro puan verildikten sonra düzenlenir (öğrenci silinir, takım sayısı azalır) → aynı isimli öğrenci id'sini ve puanını korur, silinen öğrenci ligden düşer, boşta takım kalmaz. (Task 3 testleri)

---

### Task 1: Test altyapısı ve veri katmanı (`store.js`)

**Files:**
- Create: `package.json`, `tests/t.js`, `tests/all.js`, `tests/run.mjs`, `tests/index.html`, `tests/store.test.js`, `app/core/store.js`

**Interfaces:**
- Produces:
  - `createStore(storage = globalThis.localStorage, now = () => Date.now())` → `Store`
  - `Store.persistent: boolean` (getter)
  - `Store.getClass(classId) → { teams: Team[], students: Student[] }`
  - `Store.saveClass(classId, { teams, students })`
  - `Store.addEvent({ classId, targetType: 'team'|'student', targetId, points, reason? }) → Event`
  - `Store.undo(classId) → Event | null`
  - `Store.standings(classId, { type = 'team', since = 0 }) → Array<(Team|Student) & { points }>` (puana göre azalan, eşitlikte ada göre)
  - `Store.getSetting(key, fallback = null)`, `Store.setSetting(key, value)`
  - `Store.export() → string`, `Store.import(json: string)` (geçersizse `Error` fırlatır, veri değişmez)
  - `memoryStorage()`, `weekStart(ts) → ts` (Pazartesi 00:00 yerel), `CLASS_IDS`
  - Tipler: `Team = { id, name, color }` (`color` = `'team-1'..'team-4'`), `Student = { id, name, teamId }`, `Event = { id, classId, targetType, targetId, points, reason, ts }`
  - Test kütüphanesi: `test(name, fn)`, `eq(a, b, msg?)`, `ok(v, msg?)`, `throws(fn, msg?)`, `run(log) → failCount`

- [ ] **Step 1: Test altyapısını yaz**

`package.json`:
```json
{ "private": true, "type": "module", "scripts": { "test": "node tests/run.mjs" } }
```

`tests/t.js`:
```js
const tests = [];
export function test(name, fn) { tests.push({ name, fn }); }
export function eq(a, b, msg = '') {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error(`${msg} beklenen ${y}, gelen ${x}`);
}
export function ok(v, msg = 'doğru bekleniyordu') { if (!v) throw new Error(msg); }
export function throws(fn, msg = 'hata bekleniyordu') {
  try { fn(); } catch { return; }
  throw new Error(msg);
}
export async function run(log = console.log) {
  let fail = 0;
  for (const t of tests) {
    try { await t.fn(); log(`ok   ${t.name}`); }
    catch (e) { fail++; log(`FAIL ${t.name}: ${e.message}`); }
  }
  log(`${tests.length - fail}/${tests.length} geçti`);
  return fail;
}
```

`tests/all.js`:
```js
import './store.test.js';
```

`tests/run.mjs`:
```js
import './all.js';
import { run } from './t.js';
process.exitCode = await run();
```

`tests/index.html`:
```html
<!doctype html>
<meta charset="utf-8">
<title>Testler</title>
<pre id="out" style="font:16px/1.4 monospace"></pre>
<script type="module">
  import './all.js';
  import { run } from './t.js';
  const out = document.getElementById('out');
  run(line => { out.textContent += line + '\n'; });
</script>
```

- [ ] **Step 2: Başarısız testleri yaz** — `tests/store.test.js`:
```js
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
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `npm test`
Expected: `ERR_MODULE_NOT_FOUND` … `app/core/store.js`

- [ ] **Step 4: `app/core/store.js`'i yaz**
```js
const KEY = 'okul.v1';
export const CLASS_IDS = ['11-A', '11-B', '11-C', '12-A', '12-B'];

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

export function weekStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const emptyState = () => ({ version: 1, classes: {}, events: [], settings: {} });

function isValidState(s) {
  return !!s && s.version === 1 && typeof s.classes === 'object' && s.classes !== null
    && Array.isArray(s.events)
    && s.events.every(e => e && typeof e.classId === 'string' && typeof e.targetId === 'string'
      && (e.targetType === 'team' || e.targetType === 'student')
      && Number.isFinite(e.points) && Number.isFinite(e.ts));
}

function canWrite(storage) {
  try { storage.setItem('okul.probe', '1'); return true; } catch { return false; }
}

export function createStore(storage = globalThis.localStorage, now = () => Date.now()) {
  let persistent = !!storage && canWrite(storage);
  const backend = persistent ? storage : memoryStorage();
  let state = emptyState();
  try {
    const saved = JSON.parse(backend.getItem(KEY));
    if (isValidState(saved)) state = { ...emptyState(), ...saved };
  } catch { /* bozuk kayıt: boş başla */ }

  function save() {
    if (!persistent) return;
    try { backend.setItem(KEY, JSON.stringify(state)); } catch { persistent = false; }
  }
  const uid = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function getClass(classId) {
    return state.classes[classId] ?? { teams: [], students: [] };
  }

  function standings(classId, { type = 'team', since = 0 } = {}) {
    const cls = getClass(classId);
    const roster = type === 'team' ? cls.teams : cls.students;
    const pts = new Map(roster.map(r => [r.id, 0]));
    for (const e of state.events) {
      if (e.classId === classId && e.targetType === type && e.ts >= since && pts.has(e.targetId)) {
        pts.set(e.targetId, pts.get(e.targetId) + e.points);
      }
    }
    return roster.map(r => ({ ...r, points: pts.get(r.id) }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr'));
  }

  return {
    get persistent() { return persistent; },
    getClass,
    saveClass(classId, { teams, students }) { state.classes[classId] = { teams, students }; save(); },
    addEvent({ classId, targetType, targetId, points, reason = '' }) {
      const e = { id: uid(), classId, targetType, targetId, points, reason, ts: now() };
      state.events.push(e);
      save();
      return e;
    },
    undo(classId) {
      for (let i = state.events.length - 1; i >= 0; i--) {
        if (state.events[i].classId === classId) {
          const [e] = state.events.splice(i, 1);
          save();
          return e;
        }
      }
      return null;
    },
    standings,
    getSetting(key, fallback = null) { return key in state.settings ? state.settings[key] : fallback; },
    setSetting(key, value) { state.settings[key] = value; save(); },
    export() { return JSON.stringify(state, null, 2); },
    import(json) {
      let parsed;
      try { parsed = JSON.parse(json); } catch { throw new Error('Dosya okunamadı (JSON değil).'); }
      if (!isValidState(parsed)) throw new Error('Bu dosya bir sınıf ligi yedeği değil.');
      state = { ...emptyState(), ...parsed };
      save();
    },
  };
}
```
Not: "depolama dolu" testinde `saveClass` çağrısı yazmayı dener, hata alır ve `persistent` `false` olur; sonraki `save()` çağrıları sessizce atlanır, veri bellekte kalır.

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npm test`
Expected: `12/12 geçti`

- [ ] **Step 6: Commit**
```bash
git add package.json tests app/core/store.js
git commit -m "feat: test altyapısı ve olay tabanlı veri katmanı"
```

---

### Task 2: Ünite içeriği, doğrulama, kelime destesi ve oyun oturumu

**Files:**
- Create: `app/core/content.js`, `app/modules/coach-says/deck.js`, `app/modules/coach-says/session.js`, `app/content/index.json`, `app/content/11/unit1.json`, `app/content/12/unit1.json`, `tests/content.test.js`, `tests/coach.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Produces:
  - `validateUnit(u) → string[]` (boş dizi = geçerli)
  - `loadIndex(fetchFn = fetch) → Promise<{ [grade: string]: number[] }>`
  - `loadUnit(grade, unit, fetchFn = fetch) → Promise<{ unit: Unit | null, errors: string[] }>` (asla reject etmez)
  - `Unit = { grade, unit, title, frames: string[], vocab: { word, tr, img, frame, q? }[], commands: { text, safe }[] }`; `frames` içinde boşluk `___`; `img` `content/` klasörüne görelidir.
  - `shuffle(arr, rng = Math.random) → yeni dizi`, `buildDeck(n, repeats = 3, rng = Math.random) → number[]`
  - `createSession(unit, { pick = 8, rng = Math.random }) → Session`
  - `Session`: `phase` (`'move'|'speak'|'exit'`), `index`, `total`, `words`, `current()`, `next() → bool`, `prev() → bool`, `setPhase(p)`
  - `current()` → `{ type: 'command', text, safe }` ya da `{ type: 'word', word, tr, img, frame, frameText }`
  - `PHASES = ['move', 'speak', 'exit']`

- [ ] **Step 1: Başarısız testleri yaz**

`tests/content.test.js`:
```js
import { test, eq, ok } from './t.js';
import { validateUnit, loadUnit } from '../app/core/content.js';

const good = () => ({
  grade: 11, unit: 1, title: 'Future Jobs',
  frames: ["I'm going to be a/an ___."],
  vocab: [
    { word: 'coach', tr: 'antrenör', img: 'media/11/coach.jpg', frame: 0 },
    { word: 'pilot', tr: 'pilot', img: 'media/11/pilot.jpg', frame: 0 },
  ],
  commands: [{ text: 'Coach says: jump!', safe: true }, { text: 'Sit down!', safe: false }],
});

test('content: geçerli ünite hatasız', () => eq(validateUnit(good()), []));

test('content: eksik alanlar okunur hata verir (RF3)', () => {
  const u = good();
  delete u.title;
  u.vocab[1].frame = 5;
  u.commands = [{ text: 'Coach says: run!', safe: true }];
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('title')), 'title hatası yok');
  ok(errs.some(e => e.includes('pilot') && e.includes('frame')), 'frame hatası yok');
  ok(errs.some(e => e.includes('tuzak')), 'tuzak hatası yok');
});

test('content: tek kelimelik ünite reddedilir (RF3)', () => {
  const u = good();
  u.vocab.length = 1;
  ok(validateUnit(u).some(e => e.includes('en az 2')));
});

test('content: null ve dizi olmayan alanlar çökertmez', () => {
  eq(validateUnit(null).length, 1);
  ok(validateUnit({ ...good(), vocab: 'x', frames: null, commands: {} }).length >= 3);
});

test('content: loadUnit bulunamayan dosyada çökmez', async () => {
  const r = await loadUnit(11, 9, async () => ({ ok: false }));
  eq(r.unit, null);
  ok(r.errors[0].includes('bulunamadı'));
});

test('content: loadUnit bozuk JSON', async () => {
  const r = await loadUnit(11, 1, async () => ({ ok: true, json: async () => { throw new Error('Unexpected token'); } }));
  eq(r.unit, null);
  ok(r.errors[0].includes('yüklenemedi'));
});

test('content: loadUnit geçersiz üniteyi hatalarla döndürür', async () => {
  const r = await loadUnit(11, 1, async () => ({ ok: true, json: async () => ({ ...good(), frames: [] }) }));
  eq(r.unit, null);
  ok(r.errors.length > 0);
});

const readJson = typeof window === 'undefined'
  ? async p => JSON.parse(await (await import('node:fs/promises')).readFile(new URL(`../app/${p}`, import.meta.url), 'utf8'))
  : async p => (await fetch(`../app/${p}`)).json();

test('content: pilot üniteler geçerli, tuzak oranı %20–40, index uyumlu', async () => {
  const index = await readJson('content/index.json');
  for (const [grade, units] of Object.entries(index)) {
    for (const n of units) {
      const u = await readJson(`content/${grade}/unit${n}.json`);
      eq(validateUnit(u), [], `${grade}/${n}`);
      eq([u.grade, u.unit], [Number(grade), n], `${grade}/${n} başlık`);
      const traps = u.commands.filter(c => !c.safe).length / u.commands.length;
      ok(traps >= 0.2 && traps <= 0.4, `${grade}/${n} tuzak oranı ${traps}`);
      ok(u.vocab.length >= 12 && u.vocab.length <= 16, `${grade}/${n} kelime sayısı ${u.vocab.length}`);
    }
  }
});
```

`tests/coach.test.js`:
```js
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
```

`tests/all.js`:
```js
import './store.test.js';
import './content.test.js';
import './coach.test.js';
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm test`
Expected: `ERR_MODULE_NOT_FOUND` … `app/core/content.js`

- [ ] **Step 3: `app/core/content.js`'i yaz**
```js
export function validateUnit(u) {
  if (!u || typeof u !== 'object') return ['Ünite dosyası boş veya bozuk.'];
  const errors = [];
  if (![11, 12].includes(u.grade)) errors.push('grade 11 ya da 12 olmalı.');
  if (!Number.isInteger(u.unit) || u.unit < 1 || u.unit > 10) errors.push('unit 1–10 arası olmalı.');
  if (typeof u.title !== 'string' || !u.title) errors.push('title eksik.');
  const frames = Array.isArray(u.frames) ? u.frames : [];
  if (!frames.length) errors.push('frames en az 1 cümle kalıbı içermeli.');
  if (!Array.isArray(u.vocab) || u.vocab.length < 2) {
    errors.push('vocab en az 2 kelime içermeli.');
  } else {
    u.vocab.forEach((v, i) => {
      const label = `vocab[${i}] (${v?.word ?? '?'})`;
      if (!v?.word) errors.push(`${label}: word eksik.`);
      if (!v?.img) errors.push(`${label}: img eksik.`);
      if (!Number.isInteger(v?.frame) || typeof frames[v.frame] !== 'string') errors.push(`${label}: frame numarası geçersiz.`);
    });
  }
  if (!Array.isArray(u.commands) || !u.commands.length) {
    errors.push('commands en az 1 komut içermeli.');
  } else if (!u.commands.some(c => c?.safe === false)) {
    errors.push('commands içinde en az 1 tuzak komut (safe: false) olmalı.');
  }
  return errors;
}

export async function loadIndex(fetchFn = fetch) {
  try {
    const r = await fetchFn('content/index.json');
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

export async function loadUnit(grade, unit, fetchFn = fetch) {
  const path = `content/${grade}/unit${unit}.json`;
  try {
    const r = await fetchFn(path);
    if (!r.ok) return { unit: null, errors: [`${path} bulunamadı.`] };
    const u = await r.json();
    const errors = validateUnit(u);
    return { unit: errors.length ? null : u, errors };
  } catch (e) {
    return { unit: null, errors: [`Ünite yüklenemedi: ${e.message}`] };
  }
}
```

- [ ] **Step 4: `app/modules/coach-says/deck.js`'i yaz**
```js
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// n kelimeyi `repeats` kez dolaşan dizin listesi; blok sınırında aynı kelime art arda gelmez.
export function buildDeck(n, repeats = 3, rng = Math.random) {
  const out = [];
  for (let r = 0; r < repeats; r++) {
    const block = shuffle([...Array(n).keys()], rng);
    if (n > 1 && out.length && block[0] === out[out.length - 1]) [block[0], block[1]] = [block[1], block[0]];
    out.push(...block);
  }
  return out;
}
```

- [ ] **Step 5: `app/modules/coach-says/session.js`'i yaz**
```js
import { buildDeck, shuffle } from './deck.js';

export const PHASES = ['move', 'speak', 'exit'];

export function createSession(unit, { pick = 8, rng = Math.random } = {}) {
  const words = shuffle(unit.vocab, rng).slice(0, pick);
  const commands = shuffle(unit.commands, rng);
  const deck = buildDeck(words.length, 3, rng);
  const lengths = { move: commands.length, speak: deck.length, exit: words.length };
  let phase = 'move';
  let i = 0;
  const asWord = w => ({ type: 'word', ...w, frameText: unit.frames[w.frame] });

  return {
    get phase() { return phase; },
    get index() { return i; },
    get total() { return lengths[phase]; },
    get words() { return words; },
    current() {
      if (phase === 'move') return { type: 'command', ...commands[i] };
      if (phase === 'speak') return asWord(words[deck[i]]);
      return asWord(words[i]);
    },
    next() { if (i < lengths[phase] - 1) { i++; return true; } return false; },
    prev() { if (i > 0) { i--; return true; } return false; },
    setPhase(p) {
      if (!PHASES.includes(p)) throw new Error(`Bilinmeyen tur: ${p}`);
      phase = p;
      i = 0;
    },
  };
}
```

- [ ] **Step 6: Pilot içerik dosyalarını yaz**

Kelimeler kitaptan alındı (11: Yıldırım Theme 1 okuma/dinleme metinleri; 12: Sunshine Theme 1 kelime alıştırmaları). `coach`, `police officer`, `soldier`, `firefighter`, `pilot` öğrenci hedefleri için eklendi. `q` alanı sadece fotoğraf aramasında kullanılır.

`app/content/index.json`:
```json
{ "11": [1], "12": [1] }
```

`app/content/11/unit1.json`:
```json
{
  "grade": 11, "unit": 1, "title": "Future Jobs",
  "frames": ["I'm going to be a/an ___.", "I have a job ___ tomorrow.", "I want a good ___."],
  "vocab": [
    { "word": "engineer", "tr": "mühendis", "img": "media/11/engineer.jpg", "frame": 0, "q": "civil engineer helmet construction site" },
    { "word": "architect", "tr": "mimar", "img": "media/11/architect.jpg", "frame": 0, "q": "architect drawing building plans" },
    { "word": "accountant", "tr": "muhasebeci", "img": "media/11/accountant.jpg", "frame": 0, "q": "accountant office calculator" },
    { "word": "surgeon", "tr": "cerrah", "img": "media/11/surgeon.jpg", "frame": 0, "q": "surgeon operating room" },
    { "word": "dentist", "tr": "diş hekimi", "img": "media/11/dentist.jpg", "frame": 0, "q": "dentist treating patient" },
    { "word": "vet", "tr": "veteriner", "img": "media/11/vet.jpg", "frame": 0, "q": "veterinarian examining dog" },
    { "word": "designer", "tr": "tasarımcı", "img": "media/11/designer.jpg", "frame": 0, "q": "graphic designer working computer" },
    { "word": "teacher", "tr": "öğretmen", "img": "media/11/teacher.jpg", "frame": 0, "q": "teacher classroom students" },
    { "word": "coach", "tr": "antrenör", "img": "media/11/coach.jpg", "frame": 0, "q": "sports coach training athletes" },
    { "word": "police officer", "tr": "polis memuru", "img": "media/11/police-officer.jpg", "frame": 0, "q": "police officer uniform street" },
    { "word": "soldier", "tr": "asker", "img": "media/11/soldier.jpg", "frame": 0, "q": "soldier uniform" },
    { "word": "firefighter", "tr": "itfaiyeci", "img": "media/11/firefighter.jpg", "frame": 0, "q": "firefighter hose fire" },
    { "word": "pilot", "tr": "pilot", "img": "media/11/pilot.jpg", "frame": 0, "q": "airline pilot cockpit" },
    { "word": "interview", "tr": "mülakat", "img": "media/11/interview.jpg", "frame": 1, "q": "job interview" },
    { "word": "salary", "tr": "maaş", "img": "media/11/salary.jpg", "frame": 2, "q": "banknotes money wallet" },
    { "word": "degree", "tr": "diploma", "img": "media/11/degree.jpg", "frame": 2, "q": "university graduation diploma" }
  ],
  "commands": [
    { "text": "Coach says: stand like a soldier!", "safe": true },
    { "text": "Coach says: run like a police officer!", "safe": true },
    { "text": "Coach says: fly like a pilot!", "safe": true },
    { "text": "Coach says: blow a whistle like a coach!", "safe": true },
    { "text": "Coach says: spray water like a firefighter!", "safe": true },
    { "text": "Coach says: draw a house like an architect!", "safe": true },
    { "text": "Coach says: count money like an accountant!", "safe": true },
    { "text": "Coach says: shake hands like in a job interview!", "safe": true },
    { "text": "Salute like a soldier!", "safe": false },
    { "text": "Jump like a coach!", "safe": false },
    { "text": "Write on the board like a teacher!", "safe": false },
    { "text": "Open your mouth like at the dentist!", "safe": false }
  ]
}
```

`app/content/12/unit1.json`:
```json
{
  "grade": 12, "unit": 1, "title": "Music",
  "frames": ["I prefer ___ music.", "I can play the ___.", "This music is very ___.", "My favourite ___ is …", "I like the ___ of this song."],
  "vocab": [
    { "word": "classical", "tr": "klasik", "img": "media/12/classical.jpg", "frame": 0, "q": "symphony orchestra concert" },
    { "word": "rock", "tr": "rock", "img": "media/12/rock.jpg", "frame": 0, "q": "rock band concert electric guitar" },
    { "word": "pop", "tr": "pop", "img": "media/12/pop.jpg", "frame": 0, "q": "pop concert stage singer" },
    { "word": "rap", "tr": "rap", "img": "media/12/rap.jpg", "frame": 0, "q": "rapper performing microphone" },
    { "word": "folk", "tr": "halk müziği", "img": "media/12/folk.jpg", "frame": 0, "q": "baglama saz musician" },
    { "word": "guitar", "tr": "gitar", "img": "media/12/guitar.jpg", "frame": 1, "q": "acoustic guitar" },
    { "word": "violin", "tr": "keman", "img": "media/12/violin.jpg", "frame": 1, "q": "violinist playing violin" },
    { "word": "piano", "tr": "piyano", "img": "media/12/piano.jpg", "frame": 1, "q": "grand piano" },
    { "word": "drums", "tr": "davul", "img": "media/12/drums.jpg", "frame": 1, "q": "drum kit" },
    { "word": "loud", "tr": "yüksek sesli", "img": "media/12/loud.jpg", "frame": 2, "q": "stadium crowd cheering" },
    { "word": "calm", "tr": "sakin", "img": "media/12/calm.jpg", "frame": 2, "q": "calm lake morning" },
    { "word": "song", "tr": "şarkı", "img": "media/12/song.jpg", "frame": 3, "q": "singer singing microphone" },
    { "word": "instrument", "tr": "enstrüman", "img": "media/12/instrument.jpg", "frame": 3, "q": "musical instruments collection" },
    { "word": "lyrics", "tr": "şarkı sözleri", "img": "media/12/lyrics.jpg", "frame": 4, "q": "handwritten song lyrics notebook" }
  ],
  "commands": [
    { "text": "Coach says: play the guitar!", "safe": true },
    { "text": "Coach says: play the drums!", "safe": true },
    { "text": "Coach says: dance to pop music!", "safe": true },
    { "text": "Coach says: be loud! Clap your hands!", "safe": true },
    { "text": "Coach says: be calm! Close your eyes!", "safe": true },
    { "text": "Coach says: play the piano!", "safe": true },
    { "text": "Coach says: sing a song!", "safe": true },
    { "text": "Coach says: move like a rap star!", "safe": true },
    { "text": "Play the violin!", "safe": false },
    { "text": "Dance to rock music!", "safe": false },
    { "text": "Be loud!", "safe": false },
    { "text": "Conduct a classical orchestra!", "safe": false }
  ]
}
```

- [ ] **Step 7: Testlerin geçtiğini gör**

Run: `npm test`
Expected: `25/25 geçti`

- [ ] **Step 8: Commit**
```bash
git add app/core/content.js app/modules/coach-says app/content tests
git commit -m "feat: ünite doğrulama, kelime destesi, Coach Says oturumu ve pilot içerik"
```

---

### Task 3: Zamanlayıcı ve kadro mantığı

**Files:**
- Create: `app/modules/timer/timer.js`, `app/modules/league/roster.js`, `tests/timer.test.js`, `tests/roster.test.js`
- Modify: `tests/all.js`

**Interfaces:**
- Consumes: `createStore`, `memoryStorage` (Task 1)
- Produces:
  - `formatTime(ms) → 'm:ss'` (yukarı yuvarlar, negatifte `0:00`)
  - `createTimer(now = () => performance.now())` → `{ set(ms), start(), pause(), reset(), remaining() → ms, running: bool, duration: ms }`; süresi bitmiş sayaç `start()` ile yeniden başlamaz.
  - `buildRoster(namesText, teamCount, prev = { teams: [], students: [] }, newId = () => crypto.randomUUID()) → { teams: Team[], students: Student[] }`; takım id'leri `t1..tN`, renkler `team-1..team-N`, varsayılan adlar `Team A..D`.

- [ ] **Step 1: Başarısız testleri yaz**

`tests/timer.test.js`:
```js
import { test, eq } from './t.js';
import { createTimer, formatTime } from '../app/modules/timer/timer.js';

test('timer: biçim', () => {
  eq([formatTime(65000), formatTime(0), formatTime(-5), formatTime(29001), formatTime(300000)],
    ['1:05', '0:00', '0:00', '0:30', '5:00']);
});

test('timer: başlat, duraklat, devam, bitiş, sıfırla', () => {
  let t = 0;
  const tm = createTimer(() => t);
  tm.set(30000);
  tm.start(); t = 10000;
  eq(tm.remaining(), 20000);
  tm.pause(); t = 50000;
  eq([tm.remaining(), tm.running], [20000, false]);
  tm.start(); t = 80000;
  eq(tm.remaining(), 0);
  tm.reset();
  eq([tm.remaining(), tm.running], [30000, false]);
});

test('timer: bitmiş sayaç yeniden başlamaz', () => {
  let t = 0;
  const tm = createTimer(() => t);
  tm.set(1000); tm.start(); t = 2000; tm.pause(); tm.start();
  eq(tm.running, false);
});
```

`tests/roster.test.js`:
```js
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
```

`tests/all.js`'e ekle:
```js
import './timer.test.js';
import './roster.test.js';
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npm test`
Expected: `ERR_MODULE_NOT_FOUND` … `app/modules/timer/timer.js`

- [ ] **Step 3: `app/modules/timer/timer.js`'i yaz**
```js
export function formatTime(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createTimer(now = () => performance.now()) {
  let duration = 0;
  let startedAt = null;
  let elapsedBefore = 0;
  const timer = {
    set(ms) { duration = ms; startedAt = null; elapsedBefore = 0; },
    start() { if (startedAt === null && timer.remaining() > 0) startedAt = now(); },
    pause() {
      if (startedAt !== null) { elapsedBefore += now() - startedAt; startedAt = null; }
    },
    reset() { timer.set(duration); },
    remaining() {
      const running = startedAt === null ? 0 : now() - startedAt;
      return Math.max(0, duration - elapsedBefore - running);
    },
    get running() { return startedAt !== null; },
    get duration() { return duration; },
  };
  return timer;
}
```

- [ ] **Step 4: `app/modules/league/roster.js`'i yaz**
```js
export function buildRoster(namesText, teamCount, prev = { teams: [], students: [] }, newId = () => crypto.randomUUID()) {
  const names = [...new Set(namesText.split('\n').map(n => n.trim()).filter(Boolean))];
  const teams = Array.from({ length: teamCount }, (_, i) => {
    const id = `t${i + 1}`;
    const old = prev.teams.find(t => t.id === id);
    return { id, name: old?.name ?? `Team ${String.fromCharCode(65 + i)}`, color: `team-${i + 1}` };
  });
  const students = names.map((name, i) => {
    const old = prev.students.find(s => s.name === name);
    const keepTeam = old && teams.some(t => t.id === old.teamId);
    return { id: old?.id ?? newId(), name, teamId: keepTeam ? old.teamId : teams[i % teamCount].id };
  });
  return { teams, students };
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npm test`
Expected: `33/33 geçti`

- [ ] **Step 6: Commit**
```bash
git add app/modules/timer/timer.js app/modules/league/roster.js tests
git commit -m "feat: zamanlayıcı ve kadro mantığı"
```

---

### Task 4: Tasarım sistemi ve uygulama kabuğu

**Files:**
- Create: `PRODUCT.md`, `DESIGN.md` (impeccable init üretir), `app/styles/tokens.css`, `app/styles/base.css`, `app/styles/icons.css`, `app/assets/icons/*.svg`, `scripts/icons.sh`, `app/index.html`, `app/app.js`, `app/core/router.js`, `app/core/dom.js`, `app/core/sound.js`, `app/modules/timer/timer-dock.js`, `app/modules/panel/class-select.js`

**Interfaces:**
- Consumes: `createStore`, `CLASS_IDS` (Task 1); `createTimer`, `formatTime` (Task 3)
- Produces:
  - `h(tag, props?, ...children) → HTMLElement` (`on*` olay, `class`, `style` nesnesi `setProperty` ile, `false/null` atlanır)
  - `icon(name, label?) → HTMLSpanElement`, `toast(msg)`, `seg([[value,label]...], current, onPick) → HTMLElement`
  - `createRouter(routes, onRoute) → { start(), go(hash) }`; `#/name/arg` → `routes[name]`, bilinmeyen → `routes['']`
  - Ekran arayüzü: `{ mount(el, ctx, args), unmount?() }`
  - `ctx = { store, sound, go(hash), rerender(), classId, grade, unit }` (`classId` = `store.getSetting('lastClass')`, `unit` = `getSetting('unit:<classId>', 1)`)
  - `sound.whistle()`, `sound.speak(text, { rate = 0.85 }) → bool`
  - DOM olayı: `document` üzerinde `scores-changed` (puan değişince yayınlanır)
  - CSS token adları: `--bg --surface --surface-2 --line --ink --ink-muted --accent --accent-ink --danger --team-1..4 --font-display --font-body --step-0..4 --space-1..5 --radius`

- [ ] **Step 1: `/impeccable init` çalıştır (öğretmenle birlikte)**

Soruları şu bilgilerle cevapla, öğretmen düzeltebilir:
- Ürün: 11–12. sınıf spor lisesi İngilizce dersi için akıllı tahta sınıf ligi; öğretmen dokunmatik tahtadan yönetir.
- Kitle: 16–18 yaş sporcu öğrenciler, İngilizce A1–A2; dersi zor bulan, harekete ve rekabete iyi yanıt veren bir grup. Hedefler: BESYO, polis, asker, milli sporcu.
- Bağlam: sınıfın arkasından 5 metre okunabilirlik, 1920×1080 dokunmatik Windows tahta, projeksiyon ışığında düşük kontrast riski.
- Ton: skorbord / stadyum ekranı; enerjik ama sade; spor yayını grafikleri gibi yoğun, dar başlık yazısı; az sayıda cesur renk.
- Yasaklar: Global Constraints'teki yasak listesi.

Expected: kökte `PRODUCT.md` ve `DESIGN.md`.

- [ ] **Step 2: `app/styles/tokens.css`'i yaz ve DESIGN.md'ye göre değerleri ayarla**

Aşağıdaki dosya başlangıç değerleridir; token **adları** sabit kalır, **değerleri** (renk, yazı tipi, ölçek) `DESIGN.md` kararlarıyla değiştirilir. Yazı tipi değişirse `app/index.html`'deki Google Fonts bağlantısı da güncellenir.
```css
:root {
  --bg: #0e1116;
  --surface: #171b22;
  --surface-2: #212733;
  --line: #2c3442;
  --ink: #f4f1ea;
  --ink-muted: #9aa3b2;
  --accent: #d7ff3a;
  --accent-ink: #0e1116;
  --danger: #ff5a4f;
  --team-1: #ff5a4f;
  --team-2: #3aa0ff;
  --team-3: #2fd479;
  --team-4: #ffb020;
  --font-display: 'Barlow Condensed', 'Arial Narrow', sans-serif;
  --font-body: 'Barlow', 'Segoe UI', sans-serif;
  --step-0: 32px;
  --step-1: 44px;
  --step-2: 64px;
  --step-3: 96px;
  --step-4: 140px;
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 40px;
  --space-5: 64px;
  --radius: 10px;
}
```

- [ ] **Step 3: İkonları indir** — `scripts/icons.sh`:
```bash
#!/usr/bin/env bash
# Phosphor (MIT) bold ikonlarını app/assets/icons/ içine indirir ve icons.css üretir.
set -euo pipefail
cd "$(dirname "$0")/.."
ICONS="users-three trophy timer play pause arrow-counter-clockwise arrows-out speaker-high gear caret-left caret-right x download-simple upload-simple person-simple-run chat-circle-text ticket"
mkdir -p app/assets/icons
: > app/styles/icons.css
for n in $ICONS; do
  curl -fsSL "https://cdn.jsdelivr.net/npm/@phosphor-icons/core@2/assets/bold/${n}-bold.svg" -o "app/assets/icons/${n}.svg"
  echo ".icon-${n}{--i:url(../assets/icons/${n}.svg)}" >> app/styles/icons.css
done
echo "$(echo $ICONS | wc -w) ikon indirildi"
```
Run: `bash scripts/icons.sh`
Expected: `17 ikon indirildi` (bir ikon bulunamazsa `curl` hata verir; adını phosphoricons.com'da kontrol edip düzelt).

- [ ] **Step 4: `app/styles/base.css`'i yaz**
```css
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bg); color: var(--ink);
  font: 500 var(--step-0)/1.25 var(--font-body);
  display: flex; flex-direction: column; overflow: hidden;
  user-select: none; -webkit-user-select: none; touch-action: manipulation;
}
button {
  font: inherit; color: inherit; background: var(--surface-2);
  border: 2px solid var(--line); border-radius: var(--radius);
  padding: var(--space-2) var(--space-3); min-height: 72px; cursor: pointer;
}
button:active { transform: translateY(2px); }
button:disabled { opacity: .35; cursor: default; }
button.ghost { background: transparent; border-color: transparent; }
button.small { min-height: 48px; font-size: 24px; padding: var(--space-1) var(--space-2); }
:focus-visible { outline: 4px solid var(--accent); outline-offset: 3px; }
input, textarea {
  font: inherit; color: var(--ink); background: var(--surface);
  border: 2px solid var(--line); border-radius: var(--radius);
  padding: var(--space-2); width: 100%; user-select: text; -webkit-user-select: text;
}
a { color: var(--accent); }
.display { font-family: var(--font-display); font-weight: 800; text-transform: uppercase; line-height: .95; margin: 0; }
h1.display { font-size: var(--step-3); }
.icon {
  display: inline-block; width: 1em; height: 1em; background: currentColor; vertical-align: -.125em;
  -webkit-mask: var(--i) center / contain no-repeat; mask: var(--i) center / contain no-repeat;
}

.topbar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); border-bottom: 2px solid var(--line); }
.topbar .spacer { flex: 1; }
.class-badge { font-family: var(--font-display); font-weight: 800; font-size: var(--step-1); background: var(--accent); color: var(--accent-ink); padding: 0 var(--space-2); border-radius: 6px; }
.banner { background: var(--danger); color: #fff; padding: var(--space-1) var(--space-3); font-size: 24px; }
main { flex: 1; min-height: 0; overflow: auto; padding: var(--space-4); }
.screen-host { height: 100%; }
.screen { max-width: 1800px; margin: 0 auto; display: grid; gap: var(--space-4); }

.class-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.class-btn { min-height: 240px; display: flex; align-items: baseline; justify-content: center; gap: var(--space-2); font-family: var(--font-display); font-weight: 800; }
.class-btn .grade { font-size: var(--step-3); }
.class-btn .section { font-size: var(--step-4); color: var(--accent); }
.class-btn.is-last { border-color: var(--accent); }

.seg { display: inline-flex; border: 2px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.seg button { border: 0; border-radius: 0; background: transparent; }
.seg button.is-on { background: var(--ink); color: var(--bg); }

#timer-dock { position: fixed; right: var(--space-3); bottom: var(--space-3); z-index: 10; display: grid; gap: var(--space-1); justify-items: end; }
.timer-toggle { display: flex; align-items: center; gap: var(--space-1); font-family: var(--font-display); font-weight: 800; font-variant-numeric: tabular-nums; background: var(--surface); }
#timer-dock.is-running .timer-toggle { border-color: var(--accent); }
#timer-dock.is-open .timer-toggle { font-size: var(--step-4); }
.timer-panel { display: none; gap: var(--space-1); background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius); padding: var(--space-2); }
#timer-dock.is-open .timer-panel { display: grid; }
.timer-presets, .timer-controls { display: flex; gap: var(--space-1); }
.timer-play { flex: 1; background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
body.time-up { animation: flash .5s steps(2) 6; }
@keyframes flash { 50% { background: var(--danger); } }
@media (prefers-reduced-motion: reduce) { body.time-up { animation: none; outline: 12px solid var(--danger); outline-offset: -12px; } }

.toast { position: fixed; left: 50%; bottom: var(--space-4); transform: translate(-50%, 300%); background: var(--ink); color: var(--bg); padding: var(--space-2) var(--space-4); border-radius: var(--radius); font-weight: 700; transition: transform .2s; z-index: 30; }
.toast.show { transform: translate(-50%, 0); }
```

- [ ] **Step 5: `app/core/dom.js`, `app/core/router.js`, `app/core/sound.js`'i yaz**

`app/core/dom.js`:
```js
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function icon(name, label) {
  return h('span', { class: `icon icon-${name}`, role: label ? 'img' : null, 'aria-label': label ?? null, 'aria-hidden': label ? null : 'true' });
}

export function seg(options, current, onPick) {
  return h('div', { class: 'seg', role: 'group' }, options.map(([value, label]) =>
    h('button', { class: value === current ? 'is-on' : '', 'aria-pressed': String(value === current), onclick: () => onPick(value) }, label)));
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}
```

`app/core/router.js`:
```js
export function createRouter(routes, onRoute) {
  function resolve() {
    const [, name = '', ...args] = (location.hash || '#/').split('/');
    onRoute(routes[name] ?? routes[''], args.map(decodeURIComponent));
  }
  window.addEventListener('hashchange', resolve);
  return {
    start: resolve,
    go(hash) { if (location.hash === hash) resolve(); else location.hash = hash; },
  };
}
```

`app/core/sound.js`:
```js
let ac;

export function whistle() {
  ac ??= new AudioContext();
  if (ac.state === 'suspended') ac.resume();
  const t = ac.currentTime;
  const osc = ac.createOscillator(), lfo = ac.createOscillator(), lfoGain = ac.createGain(), gain = ac.createGain();
  osc.frequency.value = 2900;
  lfo.frequency.value = 28;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(osc.frequency);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
  gain.gain.setValueAtTime(0.35, t + 0.9);
  gain.gain.linearRampToValueAtTime(0, t + 1);
  osc.connect(gain).connect(ac.destination);
  osc.start(t); lfo.start(t);
  osc.stop(t + 1.05); lfo.stop(t + 1.05);
}

export function speak(text, { rate = 0.85 } = {}) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  const voice = speechSynthesis.getVoices().find(v => v.lang === 'en-US');
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
  return true;
}
```

- [ ] **Step 6: `app/modules/timer/timer-dock.js`'i yaz**
```js
import { h, icon } from '../../core/dom.js';
import { createTimer, formatTime } from './timer.js';

const PRESETS = [[30e3, '30 sn'], [60e3, '1 dk'], [180e3, '3 dk'], [300e3, '5 dk']];

export function mountTimerDock(el, ctx) {
  const timer = createTimer();
  timer.set(60e3);
  let open = false;
  const digits = h('span', { class: 'timer-digits' });
  const playBtn = h('button', { class: 'timer-play', onclick: () => { timer.running ? timer.pause() : timer.start(); paint(); } });

  function paint() {
    digits.textContent = formatTime(timer.remaining());
    playBtn.replaceChildren(icon(timer.running ? 'pause' : 'play', timer.running ? 'Duraklat' : 'Başlat'));
    el.classList.toggle('is-open', open);
    el.classList.toggle('is-running', timer.running);
  }

  el.append(
    h('button', { class: 'timer-toggle', 'aria-label': 'Zamanlayıcı', onclick: () => { open = !open; paint(); } }, icon('timer'), digits),
    h('div', { class: 'timer-panel' },
      h('div', { class: 'timer-presets' }, PRESETS.map(([ms, label]) =>
        h('button', { onclick: () => { timer.set(ms); paint(); } }, label))),
      h('div', { class: 'timer-controls' },
        playBtn,
        h('button', { 'aria-label': 'Sıfırla', onclick: () => { timer.reset(); paint(); } }, icon('arrow-counter-clockwise')))));

  setInterval(() => {
    if (timer.running && timer.remaining() === 0) {
      timer.pause();
      ctx.sound.whistle();
      document.body.classList.add('time-up');
      setTimeout(() => document.body.classList.remove('time-up'), 3000);
    }
    paint();
  }, 200);
  paint();
}
```

- [ ] **Step 7: `app/modules/panel/class-select.js`'i yaz**
```js
import { h } from '../../core/dom.js';
import { CLASS_IDS } from '../../core/store.js';

export default {
  mount(el, ctx) {
    el.append(h('section', { class: 'screen class-select' },
      h('h1', { class: 'display' }, 'Hangi sınıf?'),
      h('div', { class: 'class-grid' }, CLASS_IDS.map(id => h('button', {
        class: `class-btn${id === ctx.classId ? ' is-last' : ''}`,
        onclick: () => { ctx.store.setSetting('lastClass', id); ctx.go('#/panel'); },
      }, h('span', { class: 'grade' }, id.slice(0, 2)), h('span', { class: 'section' }, id.slice(3)))))));
  },
};
```

- [ ] **Step 8: `app/index.html` ve `app/app.js`'i yaz**

`app/index.html`:
```html
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sınıf Ligi</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;800&family=Barlow:wght@500;700&display=swap">
  <link rel="stylesheet" href="styles/tokens.css">
  <link rel="stylesheet" href="styles/icons.css">
  <link rel="stylesheet" href="styles/base.css">
</head>
<body>
  <header class="topbar" id="topbar"></header>
  <div class="banner" id="banner" hidden></div>
  <main id="view"></main>
  <aside id="timer-dock"></aside>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script type="module" src="app.js"></script>
</body>
</html>
```

`app/app.js`:
```js
import { createStore } from './core/store.js';
import { createRouter } from './core/router.js';
import { h, icon, toast } from './core/dom.js';
import * as sound from './core/sound.js';
import { mountTimerDock } from './modules/timer/timer-dock.js';
import classSelect from './modules/panel/class-select.js';

const store = createStore();
const view = document.getElementById('view');
const banner = document.getElementById('banner');

const ctx = {
  store,
  sound,
  go: hash => router.go(hash),
  rerender: () => router.start(),
  get classId() { return store.getSetting('lastClass'); },
  get grade() { return Number(String(store.getSetting('lastClass') ?? '').slice(0, 2)); },
  get unit() { return store.getSetting(`unit:${store.getSetting('lastClass')}`, 1); },
};

// Sonraki görevler bu tabloya satır ekler.
const routes = {
  '': classSelect,
};

let active = null;
const router = createRouter(routes, (screen, args) => {
  active?.unmount?.();
  const host = h('div', { class: 'screen-host' });
  view.replaceChildren(host);
  if (screen !== classSelect && !ctx.classId) { router.go('#/'); return; }
  active = screen;
  screen.mount(host, ctx, args);
  renderTopbar();
});

function renderTopbar() {
  const cls = ctx.classId;
  document.getElementById('topbar').replaceChildren(
    h('button', { class: 'ghost', onclick: () => ctx.go('#/') }, cls ? h('span', { class: 'class-badge' }, cls) : 'Sınıf seç'),
    cls ? h('button', { class: 'ghost', onclick: () => ctx.go('#/panel') }, `Unit ${ctx.unit}`) : null,
    h('span', { class: 'spacer' }),
    cls ? h('button', { class: 'ghost', onclick: undo }, icon('arrow-counter-clockwise'), ' Geri al') : null,
    h('button', { class: 'ghost', 'aria-label': 'Tam ekran', onclick: toggleFullscreen }, icon('arrows-out')));
}

function undo() {
  const e = store.undo(ctx.classId);
  toast(e ? `Geri alındı: ${e.reason} ${e.points > 0 ? '+' : ''}${e.points}` : 'Geri alınacak işlem yok');
  document.dispatchEvent(new CustomEvent('scores-changed'));
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

function checkPersistence() {
  banner.hidden = store.persistent;
  banner.textContent = 'Puanlar bu tarayıcıya kaydedilemiyor. Ders sonunda Ayarlar → Yedeği indir.';
}
document.addEventListener('scores-changed', checkPersistence);
checkPersistence();

mountTimerDock(document.getElementById('timer-dock'), ctx);
router.start();
```

- [ ] **Step 9: Tarayıcıda doğrula**

Run: `python3 -m http.server 8000` (depo kökünde), tarayıcıda `http://localhost:8000/app/` aç, pencereyi 1920×1080 yap.
Expected:
- "Hangi sınıf?" başlığı ve 5 büyük sınıf düğmesi; yazı tipi Google Fonts'tan yüklenmiş (dar, kalın).
- Bir sınıfa dokununca adres `#/panel` olur ve (panel henüz yok) sınıf seçimine döner; üst çubukta sınıf rozeti ve "Geri al" görünür.
- Sağ alttaki zamanlayıcı açılır; 30 sn seç → başlat → sayar; bitince düdük çalar ve ekran yanıp söner.
- Tam ekran düğmesi çalışır. Konsolda hata yok.
- `npm test` hâlâ `33/33 geçti`.

- [ ] **Step 10: Commit**
```bash
git add PRODUCT.md DESIGN.md scripts/icons.sh app
git commit -m "feat: tasarım sistemi, uygulama kabuğu, zamanlayıcı ve sınıf seçimi"
```

---

### Task 5: Ders paneli, takım kurulumu ve yedek

**Files:**
- Create: `app/modules/panel/panel.js`, `app/modules/panel/setup.js`, `app/modules/registry.js`
- Modify: `app/app.js` (routes), `app/styles/base.css` (sonuna ekle)

**Interfaces:**
- Consumes: `h`, `icon`, `toast`, `seg` (Task 4); `loadIndex` (Task 2); `buildRoster` (Task 3); `Store` (Task 1)
- Produces: `games: GameModule[]` (`modules/registry.js`; bu görevde boş dizi, Task 7 doldurur); rotalar `#/panel`, `#/setup`

- [ ] **Step 1: `app/modules/registry.js`'i yaz**
```js
// Yeni oyun: modules/<oyun>/index.js yaz, buraya import edip diziye ekle.
export const games = [];
```

- [ ] **Step 2: `app/modules/panel/panel.js`'i yaz**
```js
import { h, icon } from '../../core/dom.js';
import { loadIndex } from '../../core/content.js';
import { games } from '../registry.js';

const GAME_ICONS = { 'coach-says': 'person-simple-run' };

export default {
  async mount(el, ctx) {
    const cls = ctx.store.getClass(ctx.classId);
    const index = await loadIndex();
    const available = index[ctx.grade] ?? [];
    const pickUnit = n => { ctx.store.setSetting(`unit:${ctx.classId}`, n); ctx.rerender(); };

    el.append(h('section', { class: 'screen panel' },
      h('div', { class: 'panel-head' },
        h('h1', { class: 'display' }, ctx.classId),
        h('div', { class: 'unit-row', role: 'group', 'aria-label': 'Ünite' },
          Array.from({ length: 10 }, (_, i) => i + 1).map(n => h('button', {
            class: `unit-btn${n === ctx.unit ? ' is-active' : ''}`,
            disabled: !available.includes(n),
            onclick: () => pickUnit(n),
          }, String(n))))),
      cls.teams.length ? null : h('p', { class: 'callout' }, 'Bu sınıfta henüz takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur')),
      h('div', { class: 'tiles' },
        games.map(g => h('button', { class: 'tile primary', onclick: () => ctx.go(`#/game/${g.id}`) }, icon(GAME_ICONS[g.id] ?? 'play'), g.title)),
        h('button', { class: 'tile', onclick: () => ctx.go('#/league') }, icon('trophy'), 'Lig'),
        h('button', { class: 'tile', onclick: () => ctx.go('#/setup') }, icon('users-three'), 'Takımlar'))));
  },
};
```

- [ ] **Step 3: `app/modules/panel/setup.js`'i yaz**
```js
import { h, icon, seg, toast } from '../../core/dom.js';
import { buildRoster } from '../league/roster.js';

export default {
  mount(el, ctx) {
    const cls = ctx.store.getClass(ctx.classId);
    let count = cls.teams.length || 3;
    const teamNames = cls.teams.map(t => t.name);
    const names = h('textarea', { rows: 14, placeholder: 'Her satıra bir öğrenci adı' });
    names.value = cls.students.map(s => s.name).join('\n');
    const countSeg = h('div');
    const teamInputs = h('div', { class: 'team-inputs' });

    function renderTeams() {
      countSeg.replaceChildren(seg([[2, '2'], [3, '3'], [4, '4']], count, v => { count = v; renderTeams(); }));
      teamInputs.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const input = h('input', { 'aria-label': `Takım ${i + 1} adı`, oninput: e => { teamNames[i] = e.target.value; } });
        input.value = teamNames[i] ?? `Team ${String.fromCharCode(65 + i)}`;
        return h('label', { class: 'team-input', style: { '--team': `var(--team-${i + 1})` } }, h('span', {}, `Takım ${i + 1}`), input);
      }));
    }

    function save() {
      const roster = buildRoster(names.value, count, cls);
      roster.teams.forEach((t, i) => { t.name = teamNames[i]?.trim() || t.name; });
      ctx.store.saveClass(ctx.classId, roster);
      document.dispatchEvent(new CustomEvent('scores-changed'));
      toast(`${roster.students.length} öğrenci, ${roster.teams.length} takım kaydedildi`);
      ctx.go('#/panel');
    }

    function download() {
      const a = h('a', {
        href: URL.createObjectURL(new Blob([ctx.store.export()], { type: 'application/json' })),
        download: `sinif-ligi-yedek-${new Date().toISOString().slice(0, 10)}.json`,
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || !confirm('Yedek yüklenirse bu tahtadaki TÜM sınıfların verisi yedektekiyle değişir. Devam edilsin mi?')) return;
      try {
        ctx.store.import(await file.text());
        document.dispatchEvent(new CustomEvent('scores-changed'));
        toast('Yedek yüklendi');
        ctx.go('#/panel');
      } catch (err) {
        toast(err.message);
      }
    } });

    renderTeams();
    el.append(h('section', { class: 'screen setup' },
      h('h1', { class: 'display' }, `${ctx.classId} · Takımlar`),
      h('div', { class: 'setup-col' }, h('p', {}, 'Takım sayısı'), countSeg, teamInputs),
      h('div', { class: 'setup-col' }, h('p', {}, 'Öğrenciler (her satıra bir ad; sırayla takımlara dağıtılır)'), names),
      h('div', { class: 'setup-actions' },
        h('button', { class: 'tile-inline primary', onclick: save }, 'Kaydet'),
        h('button', { class: 'ghost', onclick: () => ctx.go('#/panel') }, 'Vazgeç')),
      h('div', { class: 'backup' },
        h('span', {}, 'Ayarlar · Yedek'),
        h('button', { onclick: download }, icon('download-simple'), ' Yedeği indir'),
        h('button', { onclick: () => fileInput.click() }, icon('upload-simple'), ' Yedeği yükle'),
        fileInput)));
  },
};
```

- [ ] **Step 4: Stilleri ekle** — `app/styles/base.css` sonuna:
```css
.panel-head { display: grid; gap: var(--space-3); }
.unit-row { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.unit-btn { min-width: 88px; font-family: var(--font-display); font-weight: 800; }
.unit-btn.is-active { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.tiles { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--space-3); }
.tile { min-height: 260px; display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: var(--space-2); text-align: left; font-family: var(--font-display); font-weight: 800; font-size: var(--step-2); text-transform: uppercase; }
.tile .icon { font-size: var(--step-2); color: var(--accent); }
.tile.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.tile.primary .icon { color: var(--accent-ink); }
.callout { margin: 0; border-left: 8px solid var(--danger); padding: var(--space-2) var(--space-3); background: var(--surface); }

.setup { grid-template-columns: 1fr 1fr; align-items: start; }
.setup > h1, .setup-actions, .backup { grid-column: 1 / -1; }
.setup-col { display: grid; gap: var(--space-2); }
.setup-col p { margin: 0; color: var(--ink-muted); font-size: 24px; }
.team-inputs { display: grid; gap: var(--space-2); }
.team-input { display: grid; grid-template-columns: 160px 1fr; align-items: center; gap: var(--space-2); border-left: 14px solid var(--team); padding-left: var(--space-2); }
.setup-actions { display: flex; gap: var(--space-2); }
.tile-inline.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); min-width: 280px; font-weight: 700; }
.backup { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); border-top: 2px solid var(--line); padding-top: var(--space-3); color: var(--ink-muted); }
```

- [ ] **Step 5: Rotaları bağla** — `app/app.js`:

Import satırlarının altına ekle:
```js
import panel from './modules/panel/panel.js';
import setup from './modules/panel/setup.js';
```
`routes` nesnesini şununla değiştir:
```js
const routes = {
  '': classSelect,
  panel,
  setup,
};
```

- [ ] **Step 6: Tarayıcıda doğrula**

Expected (`http://localhost:8000/app/`, 1920×1080):
- 11-A seç → panel: büyük "11-A", 1–10 ünite düğmeleri (yalnız 1 aktif), "Bu sınıfta henüz takım yok" uyarısı, "Lig" ve "Takımlar" kutuları.
- 12-B seç → yalnız ünite 1 etkin (index.json).
- Takımlar → takım sayısı 3, 6 isim yaz (bir satır boş, bir isim tekrar) → Kaydet → "5 öğrenci, 3 takım kaydedildi"; panelde uyarı kaybolur.
- Takımlar'a dön → isimler ve takım adları korunmuş; takım adını "Lions" yap, 2 takıma düşür, kaydet → yeniden açınca 2 takım, ilk takım "Lions".
- Sayfayı yenile → veri duruyor.
- Yedeği indir → JSON iner. Rastgele bir `.json` (örn. `package.json`) yükle → onay → "Bu dosya bir sınıf ligi yedeği değil." uyarısı, veri değişmemiş (RF2). İndirilen yedeği yükle → "Yedek yüklendi".
- `npm test` `33/33 geçti`.

- [ ] **Step 7: Commit**
```bash
git add app
git commit -m "feat: ders paneli, takım kurulumu ve yedek alma"
```

---

### Task 6: Lig tablosu, puan verme ve geri alma

**Files:**
- Create: `app/modules/league/league.js`, `app/modules/league/score-sheet.js`, `app/modules/league/award.js`
- Modify: `app/app.js` (routes), `app/styles/base.css` (sonuna ekle)

**Interfaces:**
- Consumes: `Store.standings/addEvent/getClass`, `weekStart` (Task 1); `h`, `seg`, `toast` (Task 4)
- Produces:
  - `award(ctx, targetType, target, points, source) → bool` (aynı hedefe 500 ms içinde ikinci dokunuşu yok sayar; `reason` = `"<ad> · <source>"`; `scores-changed` yayınlar)
  - `openScoreSheet(ctx, targetType, target)`
  - Rota `#/league`

- [ ] **Step 1: `app/modules/league/award.js`'i yaz**
```js
import { toast } from '../../core/dom.js';

let last = { key: '', t: 0 };

// Dokunmatik tahtalar bazen tek dokunuşu iki kez iletir; aynı hedefe 500 ms içindeki ikinci puanı yok say.
export function award(ctx, targetType, target, points, source) {
  const key = `${targetType}:${target.id}:${points}`;
  const t = Date.now();
  if (key === last.key && t - last.t < 500) return false;
  last = { key, t };
  ctx.store.addEvent({ classId: ctx.classId, targetType, targetId: target.id, points, reason: `${target.name} · ${source}` });
  toast(`${target.name} ${points > 0 ? '+' : ''}${points}`);
  document.dispatchEvent(new CustomEvent('scores-changed'));
  return true;
}
```

- [ ] **Step 2: `app/modules/league/score-sheet.js`'i yaz**
```js
import { h } from '../../core/dom.js';
import { award } from './award.js';

export function openScoreSheet(ctx, targetType, target) {
  const close = () => sheet.remove();
  const btn = (points, cls) => h('button', {
    class: `pts-btn ${cls}`,
    onclick: () => { award(ctx, targetType, target, points, 'Lig'); close(); },
  }, `${points > 0 ? '+' : '−'}${Math.abs(points)}`);
  const sheet = h('div', { class: 'sheet-backdrop', onclick: e => { if (e.target === sheet) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': `${target.name} için puan` },
      h('p', { class: 'sheet-title' }, target.name),
      h('div', { class: 'sheet-btns' }, btn(1, 'plus'), btn(3, 'plus'), btn(-1, 'minus')),
      h('button', { class: 'ghost', onclick: close }, 'Vazgeç')));
  document.body.append(sheet);
}
```

- [ ] **Step 3: `app/modules/league/league.js`'i yaz**
```js
import { h, seg } from '../../core/dom.js';
import { weekStart } from '../../core/store.js';
import { openScoreSheet } from './score-sheet.js';

export default {
  mount(el, ctx) {
    let type = 'team';
    let range = 'week';
    const onChange = () => render();
    document.addEventListener('scores-changed', onChange);
    this.unmount = () => document.removeEventListener('scores-changed', onChange);

    function render() {
      const rows = ctx.store.standings(ctx.classId, { type, since: range === 'week' ? weekStart(Date.now()) : 0 });
      const teams = ctx.store.getClass(ctx.classId).teams;
      const colorOf = r => (type === 'team' ? r.color : teams.find(t => t.id === r.teamId)?.color);
      const rankOf = i => rows.findIndex(r => r.points === rows[i].points) + 1; // eşit puan = eşit sıra

      el.replaceChildren(h('section', { class: 'screen league' },
        h('div', { class: 'league-head' },
          h('h1', { class: 'display' }, 'Lig'),
          seg([['team', 'Takım'], ['student', 'Bireysel']], type, v => { type = v; render(); }),
          seg([['week', 'Bu hafta'], ['all', 'Tüm zamanlar']], range, v => { range = v; render(); })),
        rows.length
          ? h('ol', { class: `table table-${type}` }, rows.map((r, i) => {
            const color = colorOf(r);
            return h('li', { class: `row${rankOf(i) <= 3 && r.points > 0 ? ' top' : ''}`, style: { '--team': color ? `var(--${color})` : 'var(--ink-muted)' } },
              h('button', { class: 'row-btn', onclick: () => openScoreSheet(ctx, type, r) },
                h('span', { class: 'rank' }, String(rankOf(i))),
                h('span', { class: 'name' }, r.name),
                h('span', { class: 'pts' }, String(r.points))));
          }))
          : h('p', { class: 'empty' }, 'Henüz takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur'))));
    }
    render();
  },
};
```

- [ ] **Step 4: Stilleri ekle** — `app/styles/base.css` sonuna:
```css
.league-head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.league-head h1 { margin-right: auto; }
.table { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-1); }
.row-btn { width: 100%; display: grid; grid-template-columns: 120px 1fr auto; align-items: center; gap: var(--space-3); text-align: left; background: var(--surface); border-color: transparent; border-left: 14px solid var(--team); }
.rank { font-family: var(--font-display); font-weight: 800; font-size: var(--step-1); color: var(--ink-muted); }
.row.top .rank { color: var(--accent); }
.name { font-size: var(--step-1); font-weight: 700; }
.pts { font-family: var(--font-display); font-weight: 800; font-size: var(--step-2); font-variant-numeric: tabular-nums; }
.table-student .row-btn { min-height: 64px; padding-block: var(--space-1); }
.table-student .name, .table-student .rank { font-size: var(--step-0); }
.table-student .pts { font-size: var(--step-1); }
.empty { color: var(--ink-muted); }

.sheet-backdrop { position: fixed; inset: 0; background: rgb(0 0 0 / .6); display: grid; place-items: center; z-index: 20; }
.sheet { background: var(--surface); border: 2px solid var(--line); border-radius: var(--radius); padding: var(--space-4); display: grid; gap: var(--space-3); min-width: 640px; }
.sheet-title { margin: 0; font-family: var(--font-display); font-weight: 800; font-size: var(--step-2); text-transform: uppercase; }
.sheet-btns { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-2); }
.pts-btn { min-height: 160px; font-family: var(--font-display); font-weight: 800; font-size: var(--step-3); }
.pts-btn.plus { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.pts-btn.minus { background: transparent; color: var(--danger); border-color: var(--danger); }
```

- [ ] **Step 5: Rotayı bağla** — `app/app.js`:

Import ekle:
```js
import league from './modules/league/league.js';
```
`routes` nesnesine `league,` satırını `setup,` satırının altına ekle.

- [ ] **Step 6: Tarayıcıda doğrula**

Expected (Task 5'te takım kurulmuş sınıfta):
- Panel → Lig: takımlar 0 puanla, adlarına göre sıralı, sol kenarda takım rengi.
- Bir takıma dokun → +1 / +3 / −1 → sıralama anında değişir, alt ortada "Lions +3" bildirimi.
- Aynı düğmeye çok hızlı iki kez dokun → yalnız bir puan eklenir.
- Üst çubuk "Geri al" → son puan geri gider, bildirim "Geri alındı: Lions · Lig +3". Tekrar tekrar bas → en sonunda "Geri alınacak işlem yok" (RF4).
- Bireysel sekmesi → öğrenciler, sol kenarda kendi takım renkleri. Eşit puanlılar aynı sıra numarasını alır.
- "Tüm zamanlar" / "Bu hafta" arasında geçiş çalışır.
- Başka sınıfa geçip "Geri al" → ilk sınıfın puanları değişmez (RF4).

- [ ] **Step 7: Commit**
```bash
git add app
git commit -m "feat: lig tablosu, puan verme ve geri alma"
```

---

### Task 7: Coach Says ekranı

**Files:**
- Create: `app/modules/coach-says/index.js`
- Modify: `app/modules/registry.js`, `app/app.js` (routes), `app/styles/base.css` (sonuna ekle)

**Interfaces:**
- Consumes: `loadUnit` (Task 2), `createSession` + `Session` (Task 2), `award` (Task 6), `h`, `icon` (Task 4), `ctx.sound.speak` (Task 4)
- Produces: Oyun modülü `{ id: 'coach-says', title: 'Coach Says', mount(el, ctx), unmount() }`; rota `#/game/coach-says`

- [ ] **Step 1: `app/modules/coach-says/index.js`'i yaz**
```js
import { h, icon } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { createSession, PHASES } from './session.js';
import { award } from '../league/award.js';

const PHASE_LABELS = { move: '1 · Hareket', speak: '2 · Konuşma', exit: '3 · Çıkış bileti' };

function frameParts(text) {
  const [before, after = ''] = text.split('___');
  return [before, h('span', { class: 'blank' }), after];
}

export default {
  id: 'coach-says',
  title: 'Coach Says',
  unmount() {},
  async mount(el, ctx) {
    const { unit, errors } = await loadUnit(ctx.grade, ctx.unit);
    if (!unit) {
      el.append(h('section', { class: 'screen error' },
        h('h1', { class: 'display' }, 'Ünite açılamadı'),
        h('ul', {}, errors.map(e => h('li', {}, e))),
        h('button', { onclick: () => ctx.go('#/panel') }, 'Panele dön')));
      return;
    }

    const session = createSession(unit);
    const cls = ctx.store.getClass(ctx.classId);
    const answered = new Set(); // çıkış biletinde bu kelimede puan alanlar
    let showTr = false;

    const onKey = e => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    this.unmount = () => {
      document.removeEventListener('keydown', onKey);
      globalThis.speechSynthesis?.cancel();
    };

    function setPhase(p) { session.setPhase(p); answered.clear(); render(true); }

    function step(dir) {
      const moved = dir > 0 ? session.next() : session.prev();
      if (moved) { answered.clear(); render(true); return; }
      if (dir < 0) return;
      const i = PHASES.indexOf(session.phase);
      if (i < PHASES.length - 1) setPhase(PHASES[i + 1]);
      else ctx.go('#/league');
    }

    function teamButtons() {
      if (!cls.teams.length) return h('p', { class: 'callout' }, 'Takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur'));
      return h('div', { class: 'team-buttons' },
        cls.teams.map(t => h('button', {
          class: 'team-btn', style: { '--team': `var(--${t.color})` },
          onclick: () => { award(ctx, 'team', t, 1, 'Coach Says'); step(1); },
        }, t.name)),
        h('button', { class: 'ghost', onclick: () => step(1) }, 'Kimse bilemedi'));
    }

    function studentChips() {
      if (!cls.students.length) return h('p', { class: 'callout' }, 'Öğrenci listesi yok. ', h('a', { href: '#/setup' }, 'Öğrencileri ekle'));
      return h('div', { class: 'student-chips' }, cls.students.map(s => h('button', {
        class: `chip${answered.has(s.id) ? ' is-done' : ''}`,
        disabled: answered.has(s.id),
        onclick: () => { if (award(ctx, 'student', s, 1, 'Çıkış bileti')) { answered.add(s.id); render(false); } },
      }, s.name)));
    }

    function render(announce) {
      const c = session.current();
      let stage;
      if (c.type === 'command') {
        stage = h('div', { class: 'stage stage-move' },
          h('p', { class: 'command' }, c.text),
          h('button', { class: 'ghost', 'aria-label': 'Tekrar oku', onclick: () => ctx.sound.speak(c.text) }, icon('speaker-high')));
        if (announce) ctx.sound.speak(c.text);
      } else {
        const img = h('img', {
          class: 'word-photo', src: `content/${c.img}`, alt: c.word,
          onerror: () => { img.replaceWith(h('div', { class: 'photo-missing' }, `Görsel yok: ${c.img}`)); console.warn('Eksik görsel:', c.img); },
        });
        stage = h('div', { class: 'stage stage-word' },
          img,
          h('div', { class: 'word-side' },
            h('button', { class: 'word', onclick: () => ctx.sound.speak(c.word) }, c.word),
            showTr && c.tr ? h('p', { class: 'tr' }, c.tr) : null,
            h('p', { class: 'frame' }, frameParts(c.frameText)),
            h('button', { class: 'ghost small', onclick: () => { showTr = !showTr; render(false); } }, showTr ? 'Türkçeyi gizle' : 'Türkçe')),
          session.phase === 'speak' ? teamButtons() : studentChips());
        if (announce) ctx.sound.speak(c.word);
      }

      el.replaceChildren(h('section', { class: `screen coach phase-${session.phase}` },
        h('header', { class: 'coach-head' },
          h('nav', { class: 'phase-tabs' }, PHASES.map(p =>
            h('button', { class: p === session.phase ? 'is-on' : '', onclick: () => setPhase(p) }, PHASE_LABELS[p]))),
          h('span', { class: 'progress' }, `${session.index + 1} / ${session.total}`)),
        stage,
        h('div', { class: 'nav-btns' },
          h('button', { class: 'nav', 'aria-label': 'Önceki', onclick: () => step(-1) }, icon('caret-left')),
          h('button', { class: 'nav next', 'aria-label': 'Sonraki', onclick: () => step(1) }, icon('caret-right')))));
    }

    render(true);
  },
};
```

- [ ] **Step 2: Oyunu kaydet** — `app/modules/registry.js`:
```js
// Yeni oyun: modules/<oyun>/index.js yaz, buraya import edip diziye ekle.
import coachSays from './coach-says/index.js';

export const games = [coachSays];
```

- [ ] **Step 3: Oyun rotasını bağla** — `app/app.js`:

Import ekle:
```js
import { games } from './modules/registry.js';
```
`routes` nesnesinin üstüne ekle:
```js
const gameRoute = {
  current: null,
  mount(el, c, [id]) {
    this.current = games.find(g => g.id === id) ?? null;
    if (!this.current) { c.go('#/panel'); return; }
    return this.current.mount(el, c);
  },
  unmount() { this.current?.unmount?.(); },
};
```
`routes` nesnesine `game: gameRoute,` satırını `league,` satırının altına ekle.

- [ ] **Step 4: Stilleri ekle** — `app/styles/base.css` sonuna:
```css
.coach { height: 100%; grid-template-rows: auto 1fr auto; }
.coach-head { display: flex; align-items: center; gap: var(--space-3); }
.phase-tabs { display: flex; gap: var(--space-1); margin-right: auto; }
.phase-tabs .is-on { background: var(--ink); color: var(--bg); }
.progress { font-family: var(--font-display); font-size: var(--step-1); color: var(--ink-muted); font-variant-numeric: tabular-nums; }
.stage-move { display: grid; place-items: center; align-content: center; gap: var(--space-3); text-align: center; }
.command { font-family: var(--font-display); font-weight: 800; font-size: var(--step-4); line-height: .95; text-transform: uppercase; margin: 0; max-width: 16ch; }
.stage-move .ghost { font-size: var(--step-2); }
.stage-word { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; gap: var(--space-4); min-height: 0; }
.word-photo, .photo-missing { width: 100%; height: 100%; max-height: 56vh; object-fit: cover; border-radius: var(--radius); }
.photo-missing { display: grid; place-items: center; border: 2px dashed var(--danger); color: var(--danger); font-size: 24px; }
.word-side { display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: var(--space-3); }
.word { all: unset; cursor: pointer; font-family: var(--font-display); font-weight: 800; font-size: var(--step-4); line-height: .9; text-transform: uppercase; }
.tr { margin: 0; color: var(--ink-muted); font-size: var(--step-1); }
.frame { margin: 0; font-size: var(--step-2); font-weight: 700; }
.blank { display: inline-block; width: 4ch; margin: 0 .2ch; border-bottom: 6px solid var(--accent); }
.team-buttons, .student-chips { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: var(--space-2); }
.team-btn { flex: 1; min-height: 120px; background: var(--team); color: var(--bg); border-color: var(--team); font-family: var(--font-display); font-weight: 800; font-size: var(--step-2); text-transform: uppercase; }
.chip { min-height: 64px; font-size: 28px; }
.chip.is-done, .chip.is-done:disabled { background: var(--accent); color: var(--accent-ink); opacity: 1; }
.nav-btns { display: flex; justify-content: space-between; }
.nav { min-width: 160px; font-size: var(--step-2); }
.nav.next { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.error ul { color: var(--danger); font-size: 28px; }
```

- [ ] **Step 5: Tarayıcıda doğrula** (Chrome veya Edge; ses açık)

Expected:
- Panelde "Coach Says" kutusu en büyük kutu → açılır. Tur 1: dev harflerle komut, açılışta sesli okunur; hoparlör düğmesi tekrar okur; sağ ok ve klavyede → sonraki komut; 12 komuttan sonra otomatik Tur 2.
- Tur 2: solda fotoğraf (fotoğraflar Task 8'de gelir; şimdilik kırmızı kesikli "Görsel yok: media/11/…" kutusu ve konsolda uyarı — çökme yok), sağda kelime (dokununca okunur), altı çizili boşluklu kalıp, "Türkçe" düğmesi anlamı açıp kapatır. Takım düğmesi → +1 ve sonraki kart; "Kimse bilemedi" → puansız sonraki. İlerleme `1 / 24`.
- Tur 3: kelime + öğrenci adları; ada dokununca +1, ad sarıya döner ve o kelimede tekrar seçilemez. Son kelimeden sonra lig açılır ve puanlar orada görünür.
- `app/content/11/unit1.json`'da `"title"` satırını geçici sil → Coach Says "Ünite açılamadı" + `title eksik.` gösterir (RF3). Satırı geri koy.
- Takımsız bir sınıfta Coach Says → Tur 2'de "Takım yok. Takımları kur" bağlantısı.
- `npm test` `33/33 geçti`.

- [ ] **Step 6: Commit**
```bash
git add app
git commit -m "feat: Coach Says ekranı (hareket, konuşma, çıkış bileti)"
```

---

### Task 8: Gerçek fotoğraflar ve kaynakça

**Files:**
- Create: `scripts/commons.py`, `tests/photos.html`, `app/content/media/11/*.jpg`, `app/content/media/12/*.jpg`, `app/content/media/CREDITS.md`

**Interfaces:**
- Consumes: ünite JSON'larındaki `img` ve `q` alanları (Task 2)

- [ ] **Step 1: `scripts/commons.py`'yi yaz**
```python
#!/usr/bin/env python3
"""Ünite dosyasındaki her kelime için Wikimedia Commons'tan serbest lisanslı gerçek fotoğraf indirir.

Kullanım:  python3 scripts/commons.py app/content/11/unit1.json [--force] [--only kelime]
Var olan dosyaya dokunmaz (--force hariç). Kaynağı app/content/media/CREDITS.md'ye ekler.
"""
import html
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request

API = 'https://commons.wikimedia.org/w/api.php'
HEADERS = {'User-Agent': 'okul-sinif-ligi/0.1 (egitim amacli prototip)'}
FREE = re.compile(r'^(CC0|Public domain|CC BY(-SA)? \d(\.\d)?)', re.I)


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def search(query, skip=0):
    params = {
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': 6,
        'gsrlimit': 20, 'gsrsearch': f'{query} filetype:bitmap',
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata|mime', 'iiurlwidth': 1400,
    }
    data = json.loads(get(f'{API}?{urllib.parse.urlencode(params)}'))
    pages = sorted(data.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    hits = []
    for p in pages:
        info = p['imageinfo'][0]
        meta = info.get('extmetadata', {})
        lic = meta.get('LicenseShortName', {}).get('value', '')
        if info.get('mime') == 'image/jpeg' and FREE.match(lic) and info.get('thumbwidth', 0) >= 1000:
            artist = re.sub(r'<[^>]+>', '', html.unescape(meta.get('Artist', {}).get('value', 'bilinmiyor'))).strip()
            hits.append((info['thumburl'], info['descriptionurl'], artist, lic))
    return hits[skip] if len(hits) > skip else None


def main():
    unit_path = pathlib.Path(sys.argv[1])
    force = '--force' in sys.argv
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    skip = int(sys.argv[sys.argv.index('--skip') + 1]) if '--skip' in sys.argv else 0
    content = unit_path.parent.parent
    credits = content / 'media' / 'CREDITS.md'
    unit = json.loads(unit_path.read_text(encoding='utf-8'))
    lines = []
    for v in unit['vocab']:
        if only and v['word'] != only:
            continue
        dest = content / v['img']
        if dest.exists() and not force:
            print('var   ', v['word'])
            continue
        hit = search(v.get('q', v['word']), skip)
        if not hit:
            print('YOK   ', v['word'], '→ elle ekle (Pexels/Unsplash) ve CREDITS.md\'ye yaz')
            continue
        url, page, artist, lic = hit
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(get(url))
        lines.append(f'- `{v["img"]}` — {artist}, {lic}, {page}')
        print('indi  ', v['word'])
    if lines:
        if not credits.exists():
            credits.write_text('# Görsel kaynakları\n\nTüm görseller serbest lisanslıdır.\n\n', encoding='utf-8')
        with credits.open('a', encoding='utf-8') as f:
            f.write('\n'.join(lines) + '\n')


main()
```

- [ ] **Step 2: Fotoğrafları indir**

Run:
```bash
python3 scripts/commons.py app/content/11/unit1.json
python3 scripts/commons.py app/content/12/unit1.json
```
Expected: her kelime için `indi` ya da `YOK` satırı; `app/content/media/CREDITS.md` oluşur.

- [ ] **Step 3: İnceleme sayfasını yaz** — `tests/photos.html`:
```html
<!doctype html>
<meta charset="utf-8">
<title>Fotoğraf incelemesi</title>
<style>
  body { font: 18px system-ui; margin: 24px; background: #111; color: #eee; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  figure { margin: 0; } img { width: 100%; aspect-ratio: 4/3; object-fit: cover; background: #400; }
  figcaption { padding: 4px 0; } h2 { margin-top: 32px; }
</style>
<div id="out"></div>
<script type="module">
  const out = document.getElementById('out');
  const index = await (await fetch('../app/content/index.json')).json();
  for (const [grade, units] of Object.entries(index)) {
    for (const n of units) {
      const u = await (await fetch(`../app/content/${grade}/unit${n}.json`)).json();
      out.insertAdjacentHTML('beforeend', `<h2>${grade} · Unit ${n} · ${u.title}</h2><div class="grid">${
        u.vocab.map(v => `<figure><img src="../app/content/${v.img}" alt=""><figcaption><b>${v.word}</b> — ${v.img}</figcaption></figure>`).join('')
      }</div>`);
    }
  }
</script>
```

- [ ] **Step 4: Fotoğrafları öğretmenle gözden geçir**

`http://localhost:8000/tests/photos.html` aç. Her fotoğraf için kontrol:
- Kelimeyi A1 öğrenci için tek bakışta anlatıyor mu? (örn. `vet` → köpekle veteriner, laboratuvar değil)
- Stok fotoğraf yapaylığı, filigran, metin, uygunsuz içerik yok mu?
- Kırmızı boş kutu = eksik.

Uymayanlar için sıradaki sonucu dene: `python3 scripts/commons.py app/content/11/unit1.json --only vet --force --skip 1` (ya da `--skip 2`…). Commons'ta iyisi yoksa Pexels/Unsplash'ten elle indir, `img` yoluna kaydet ve `CREDITS.md`'ye `- \`media/11/vet.jpg\` — <fotoğrafçı>, Pexels License, <sayfa adresi>` satırını ekle. `--force` ile değişen dosyanın eski CREDITS satırını sil.
Expected: 30 fotoğrafın tamamı onaylı, `CREDITS.md`'de her dosya için tam olarak bir satır.

- [ ] **Step 5: Boyutu kontrol et**

Run: `du -sh app/content/media && ls app/content/media/11 app/content/media/12 | grep -c jpg`
Expected: toplam < 15 MB, `30`. Bir dosya 800 KB'tan büyükse: `sips -Z 1400 -s formatOptions 75 <dosya>` (macOS).

- [ ] **Step 6: Commit**
```bash
git add scripts/commons.py tests/photos.html app/content/media
git commit -m "feat: pilot üniteler için serbest lisanslı fotoğraflar ve kaynakça"
```

---

### Task 9: Tasarım incelemesi ve uçtan uca ders provası

**Files:**
- Modify: `app/styles/*.css`, ilgili ekran modülleri (bulgulara göre)

- [ ] **Step 1: Her ekran için `/impeccable critique` ve `/impeccable audit` çalıştır**

Sırayla: sınıf seçimi, panel, takımlar, lig, Coach Says (3 tur), zamanlayıcı açık hâli. `http://localhost:8000/app/` 1920×1080'de.
Bulgular `PRODUCT.md`/`DESIGN.md` ile çelişiyorsa ya da Global Constraints'teki yasaklara takılıyorsa düzelt. Her düzeltmeden sonra ilgili ekranı yeniden aç.

- [ ] **Step 2: 5 metre testi**

Tarayıcı yakınlaştırmasını %50'ye al (uzaktan bakışın kabaca karşılığı). Expected: lig puanları, komut metni, oyun kelimesi ve zamanlayıcı rakamları hâlâ okunur; okunmayan metin varsa ilgili `--step-*` değerini büyüt.

- [ ] **Step 3: Uçtan uca prova (40 dk'lık ders akışı, hızlandırılmış)**

1. Temiz başlangıç: tarayıcı konsolunda `localStorage.removeItem('okul.v1')`, sayfayı yenile.
2. 11-B seç → Takımlar → 3 takım, 12 öğrenci → Kaydet.
3. Zamanlayıcı 30 sn → bitişte düdük + yanıp sönme.
4. Coach Says: Tur 1'de 3 komut, Tur 2'de 6 kart (takımlara puan dağıt, 1 "Kimse bilemedi"), Tur 3'te 3 kelime ve 5 öğrenci puanı.
5. Lig: takım ve bireysel puanlar Coach Says'te verilenlerle birebir tutuyor. Bir puanı "Geri al" ile geri al → tablo güncellenir.
6. Sayfayı yenile → her şey duruyor. Yedeği indir.
7. Gizli pencerede aç → depolama çalışıyorsa normal; tarayıcı depolamayı engelliyorsa kırmızı uyarı şeridi görünür ve puan vermek yine çalışır (RF1).
8. 12-A'ya geç → 11-B'nin puanları görünmez; ünite seçici 12'nin index'ini kullanır.
Expected: tüm adımlar hatasız, konsolda hata yok, `npm test` `33/33 geçti`.

- [ ] **Step 4: Commit**
```bash
git add -A app PRODUCT.md DESIGN.md
git commit -m "fix: tasarım incelemesi ve prova düzeltmeleri"
```

---

### Task 10: Yayına alma (öğretmen onayıyla)

**Files:**
- Create: `README.md`

- [ ] **Step 1: `README.md`'yi yaz**
```markdown
# Sınıf Ligi — Spor Lisesi İngilizce

Akıllı tahta için sınıf ligi, zamanlayıcı ve Coach Says oyunu.

- Tahtada aç: <yayın adresi>/app/  → tam ekran düğmesi (sağ üst)
- Yerelde çalıştır: `python3 -m http.server 8000` → http://localhost:8000/app/
- Testler: `npm test` (Node) ya da http://localhost:8000/tests/
- Yeni ünite: `app/content/<sınıf>/unit<n>.json` ekle, `app/content/index.json`'a numarasını yaz, `python3 scripts/commons.py <dosya>` ile fotoğrafları indir.
- Yeni oyun: `app/modules/<oyun>/index.js` (`{ id, title, mount, unmount }`) yaz, `app/modules/registry.js`'e ekle.
- Puanlar tahtanın tarayıcısında durur. Her hafta Takımlar → Yedeği indir.
- Tasarım: `PRODUCT.md`, `DESIGN.md`. Görsel kaynakları: `app/content/media/CREDITS.md`.
```

- [ ] **Step 2: Öğretmene sor ve onay bekle**

Yayın dışa açık bir adımdır. Sor: "Kod ve fotoğraflar herkese açık bir GitHub deposuna konacak; kitap PDF'leri ve öğrenci isimleri depoya girmez (isimler yalnız tahtanın tarayıcısında). GitHub Pages ile yayınlayayım mı?" Onay gelmezse bu görevi burada bitir; tahtada yerel sunucu yerine `app/` klasörü bir USB ile taşınıp aynı `python3 -m http.server` komutuyla açılabilir.

- [ ] **Step 3: Onay gelirse yayınla**

Run:
```bash
git ls-files | grep -iE '\.pdf$' && echo "PDF VAR, DUR" || echo "PDF yok"
gh repo create sinif-ligi --public --source . --push
gh api -X POST repos/{owner}/sinif-ligi/pages -f 'source[branch]=main' -f 'source[path]=/'
gh api repos/{owner}/sinif-ligi/pages --jq .html_url
```
Expected: `PDF yok`; son komut `https://<kullanıcı>.github.io/sinif-ligi/` verir. 1–2 dk sonra `<adres>app/` tahtanın tarayıcısında açılır. README'deki `<yayın adresi>`'ni gerçek adresle değiştir.

- [ ] **Step 4: Commit**
```bash
git add README.md
git commit -m "docs: kullanım ve yayın notları"
git push
```
