import { createStore } from './core/store.js';
import { createRouter } from './core/router.js';
import { h, icon, toast } from './core/dom.js';
import * as sound from './core/sound.js';
import { mountTimerDock } from './modules/timer/timer-dock.js';
import classSelect from './modules/panel/class-select.js';
import panel from './modules/panel/panel.js';
import setup from './modules/panel/setup.js';
import today from './modules/panel/today.js';
import cloudScreen from './modules/panel/cloud.js';
import { CLOUD } from './config.js';
import { connectCloud } from './core/cloud-client.js';
import { createSync } from './core/sync.js';
import { offlineStatus } from './core/offline.js';
import { floatPoints } from './core/fx.js';
import league from './modules/league/league.js';
import { games } from './modules/registry.js';
import { loadUnit } from './core/content.js';
import { advance, normalize, stepRoute, currentRoute } from './core/lesson-plan.js';
import { dayKey } from './core/levels.js';

let finishing = false; // aynı adım için ikinci "bitti" sinyali yok sayılır; ekran değişince sıfırlanır

const store = createStore();
store.dailySnapshot(); // günün ilk açılışında otomatik yedek (güncelleme veriyi bozarsa geri dönüş)
const view = document.getElementById('view');
const banner = document.getElementById('banner');

const ctx = {
  store,
  sound,
  go: hash => router.go(hash),
  rerender: () => router.start(),
  refreshTopbar: () => renderTopbar(),
  get classId() { return store.getSetting('lastClass'); },
  get grade() { return Number(String(store.getSetting('lastClass') ?? '').slice(0, 2)); },
  get unit() { return store.getSetting(`unit:${store.getSetting('lastClass')}`, 1); },
  // Ders planı: "Derse başla" ile başlar; her etkinlik bitince finishActivity plandaki sıradaki adıma gider
  // Ders yalnız başladığı gün ve aynı ünitede "çalışıyor" sayılır (yarım kalan ders ertesi gün devreye girmez)
  // Bulut (Faz 5a): bağlantı bilgisi koddaki config.js'ten ya da bu tahtada bir kez girilen değerden
  cloud: { client: null, sync: null, status: 'off' },
  offline: { state: 'off' }, // tahtaya kaç dosya indi (çevrimdışı açılış)
  cloudConfig() {
    if (CLOUD.url && CLOUD.anonKey) return { ...CLOUD, fromCode: true };
    try { return JSON.parse(localStorage.getItem('okul.cloud') || 'null'); } catch { return null; }
  },
  saveCloudConfig(conf) { try { conf ? localStorage.setItem('okul.cloud', JSON.stringify(conf)) : localStorage.removeItem('okul.cloud'); } catch { /* yok */ } },
  async startCloud() {
    const conf = ctx.cloudConfig();
    if (!conf?.url) { ctx.cloud.status = 'off'; renderTopbar(); return; }
    try {
      ctx.cloud.client ??= await connectCloud(conf);
      if (!(await ctx.cloud.client.session())) { ctx.cloud.status = 'login'; renderTopbar(); return; }
      if (!ctx.cloud.sync) {
        const sync = createSync({ store, cloud: ctx.cloud.client });
        ctx.cloud.sync = sync;
        sync.seed(); // buluttan önce biriken veri bir kez yüklenir
        sync.onStatus(() => renderTopbar());
        sync.start({ onRemote: () => document.dispatchEvent(new CustomEvent('scores-changed')) });
      }
      ctx.cloud.status = 'on';
    } catch {
      ctx.cloud.status = 'offline'; // CDN ya da internet yok: tahta yerel çalışır
    }
    renderTopbar();
  },
  inLesson() { const r = store.getSetting(`lessonRun:${ctx.classId}`); return r?.unit === ctx.unit && r?.day === dayKey(Date.now()); },
  stopLesson() { store.setSetting(`lessonRun:${ctx.classId}`, null); },
  // Ünitenin hangi dersindeyiz (1'den başlar); içerik ders ders değişir
  async lessonNo() {
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    if (!unit?.lessons?.length) return 1;
    const p = normalize(unit, ctx.lessonProgress());
    return Math.min(p.lesson, unit.lessons.length - 1) + 1;
  },
  lessonProgress() { return store.getSetting(`lesson:${ctx.classId}:${ctx.unit}`, { lesson: 0, step: 0 }); },
  async startLesson() {
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    if (!unit?.lessons) return;
    let p = normalize(unit, ctx.lessonProgress());
    if (p.unitDone) { toast('Ünite tamamlandı'); return; }
    const attendanceStep = s => s?.type === 'attendance';
    // Yoklama bugün alındıysa yoklama adımını atla; alınmadıysa (ör. yarım ders ertesi gün) önce yoklama
    if (attendanceStep(unit.lessons[p.lesson].steps[p.step]) && store.isAttendanceDone(ctx.classId)) p = advance(unit, p);
    else if (!attendanceStep(unit.lessons[p.lesson].steps[p.step]) && !store.isAttendanceDone(ctx.classId)) {
      store.setSetting(`resumeLesson:${ctx.classId}`, true);
      ctx.go('#/today');
      return;
    }
    store.setSetting(`lesson:${ctx.classId}:${ctx.unit}`, { lesson: p.lesson, step: p.step });
    // Ders başında seviye: önceki dersin sınıf doğruluğu %80+ ise bir üst seviye
    const lv = store.ensureLessonLevel(ctx.classId, `${ctx.unit}:${p.lesson + 1}`);
    if (lv.changed) toast(`Seviye yükseldi: ${lv.level}${lv.rate !== undefined ? ` · geçen ders %${lv.rate}` : ''}`);
    else if (lv.rate !== undefined) toast(`Seviye ${lv.level} · geçen ders %${lv.rate} (üst seviye için %80)`);
    store.setSetting(`lessonRun:${ctx.classId}`, { unit: ctx.unit, day: dayKey(Date.now()) });
    if (campPending(unit, p)) { ctx.go('#/game/pre-season'); return; }
    ctx.go(stepRoute(unit.lessons[p.lesson].steps[p.step], unit));
  },
  // Ön Kamp bitince: ders sürüyorsa planın şu anki adımına, değilse panele
  async continueLesson() {
    if (!ctx.inLesson()) { ctx.go('#/panel'); return; }
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    const route = unit ? currentRoute(unit, ctx.lessonProgress()) : null;
    ctx.go(route ?? '#/panel');
  },
  // fallback: ders planı dışında (serbest etkinlik) gidilecek yer
  // route: bu sinyali gönderen adımın adresi (varsayılan: şu anki sayfa). Planın şu anki adımı değilse plan ilerlemez.
  async finishActivity(fallback = '#/panel', route = location.hash) {
    if (finishing) return;
    if (!ctx.inLesson()) { ctx.go(fallback); return; }
    finishing = true;
    const progress = ctx.lessonProgress(); // beklemeden önce oku
    const here = location.hash;
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    if (location.hash !== here) { finishing = false; return; } // öğretmen bu arada başka ekrana geçti
    if (!unit?.lessons || currentRoute(unit, progress) !== route) { finishing = false; ctx.go(fallback); return; }
    const next = advance(unit, progress);
    store.setSetting(`lesson:${ctx.classId}:${ctx.unit}`, { lesson: next.lesson, step: next.step });
    if (next.lessonDone || next.unitDone) {
      store.setSetting(`lessonRun:${ctx.classId}`, null);
      toast(next.unitDone ? 'Ünite tamamlandı!' : `Ders ${next.lesson} bitti`);
      ctx.go('#/league');
      return;
    }
    if (campPending(unit, next)) { ctx.go('#/game/pre-season'); return; } // ünitenin ilk dersi: yoklamadan sonra Ön Kamp
    ctx.go(stepRoute(unit.lessons[next.lesson].steps[next.step], unit));
  },
};

// Ön Kamp yalnız ünitenin 1. dersinde, yoklamadan hemen sonra ve bir kez (plan adımları kaymaz)
function campPending(unit, p) {
  return !!unit?.camp && p.lesson === 0 && p.step === 1 && !store.getSetting(`campDone:${ctx.classId}:${ctx.unit}`);
}

// Sonraki görevler bu tabloya satır ekler.
const gameRoute = {
  current: null,
  mount(el, c, [id, ...args]) {
    this.current = games.find(g => g.id === id) ?? null;
    if (!this.current) { c.go('#/panel'); return; }
    return this.current.mount(el, c, args); // ör. #/game/coach-says/exit
  },
  unmount() { this.current?.unmount?.(); },
};

const routes = {
  '': classSelect,
  panel,
  setup,
  today,
  cloud: cloudScreen,
  league,
  game: gameRoute,
};

let active = null;
const router = createRouter(routes, (screen, args) => {
  finishing = false;
  active?.unmount?.();
  const host = h('div', { class: 'screen-host' });
  view.replaceChildren(host);
  if (screen !== classSelect && screen !== cloudScreen && !ctx.classId) { active = null; router.go('#/'); return; }
  active = screen;
  Promise.resolve(screen.mount(host, ctx, args)).catch(err => {
    console.error(err);
    host.replaceChildren(h('section', { class: 'screen error' },
      h('h1', { class: 'display' }, 'Bu ekran açılamadı'), h('p', { class: 'hint' }, String(err?.message ?? err)),
      h('div', { class: 'today-actions' }, h('button', { onclick: () => ctx.go('#/panel') }, 'Panele dön'),
        h('button', { class: 'go', onclick: () => ctx.finishActivity('#/panel') }, 'Sonraki adım'))));
  });
  renderTopbar();
});

function renderTopbar() {
  const cls = ctx.classId;
  document.getElementById('topbar').replaceChildren(...[
    h('button', { class: 'ghost', onclick: () => ctx.go('#/') }, h('span', { class: 'class-badge' }, cls ?? 'English League')),
    cls ? h('button', { class: 'ghost', onclick: () => ctx.go('#/panel') }, `Unit ${ctx.unit}`) : null,
    h('span', { class: 'spacer' }),
    document.getElementById('timer-dock'),
    cls ? h('button', { class: 'ghost', onclick: undo }, icon('arrow-counter-clockwise'), ' Geri al') : null,
    offlineChip(),
    cloudButton(),
    h('button', { class: 'ghost', 'aria-label': 'Tam ekran', onclick: toggleFullscreen }, icon('arrows-out')),
  ].filter(Boolean)); // boş öğe "null" yazısı olarak görünmesin
}

// İndirme sürerken üst çubukta sayaç; bitince kaybolur (durum Bulut ekranında da görünür)
function offlineChip() {
  const o = ctx.offline;
  if (o.state !== 'loading' || !o.total) return null;
  return h('button', { class: 'ghost offline-chip', title: 'Uygulama tahtaya iniyor', onclick: () => ctx.go('#/cloud') },
    icon('download-simple'), ` ${Math.round((o.cached / o.total) * 100)}%`);
}

// Bulut simgesi: yeşil eşitlendi, sarı bekleyen kayıt, gri çevrimdışı ya da giriş yok
function cloudButton() {
  const c = ctx.cloud;
  if (c.status === 'off' && !ctx.cloudConfig()) return null;
  const s = c.sync;
  const state = c.status !== 'on' ? 'off' : s?.status === 'offline' ? 'off' : s?.pending ? 'wait' : 'ok';
  const label = { ok: 'Bulut: eşitlendi', wait: `Bulut: ${s?.pending} kayıt bekliyor`, off: c.status === 'login' ? 'Bulut: giriş yapılmadı' : 'Bulut: çevrimdışı' }[state];
  return h('button', { class: `ghost cloud-btn is-${state}`, 'aria-label': label, title: label, onclick: () => ctx.go('#/cloud') },
    icon(state === 'ok' ? 'cloud-check' : state === 'wait' ? 'cloud-arrow-up' : 'cloud-slash'));
}

function undo() {
  const e = store.undo(ctx.classId);
  toast(!e ? 'Geri alınacak işlem yok'
    : e.groupId ? `Geri alındı: ${e.reason} ve aynı cevaba bağlı puanlar`
      : `Geri alındı: ${e.reason} ${e.points > 0 ? '+' : ''}${e.points}`);
  document.dispatchEvent(new CustomEvent('scores-changed', { detail: { undone: e } }));
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

function checkPersistence() {
  banner.hidden = store.persistent && !store.nearlyFull;
  banner.textContent = store.persistent ? 'Depolama dolmak üzere: Takımlar → Yedeği indir ile yedek alın.' : 'Puanlar bu tarayıcıya kaydedilemiyor. Ders sonunda Ayarlar → Yedeği indir.';
}
document.addEventListener('scores-changed', checkPersistence);
checkPersistence();

mountTimerDock(document.getElementById('timer-dock'), ctx);
ctx.startCloud();

// Ekrana sığdır: tasarım 1600×900; daha küçük pencerede her şey aynı oranda küçülür (üst üste binme ve kırpılma olmaz)
function fitScreen() {
  const z = Math.min(1, innerWidth / 1600, innerHeight / 900);
  document.documentElement.style.setProperty('--z', z.toFixed(3));
  document.documentElement.style.setProperty('--vh', `${(innerHeight / z / 100).toFixed(2)}px`);
}
fitScreen();
addEventListener('resize', fitScreen);
router.start();

// Çevrimdışı açılış: okul ağı siteyi engellese de tahta uygulamayı kendi hafızasından açar (bkz. ../sw.js)
// Puan verilince dokunulan düğmenin üstünden "+N" yükselir (geri alma ve eksi puanda değil)
let lastTap = { el: null, t: 0 };
document.addEventListener('pointerdown', e => { lastTap = { el: e.target.closest('button'), t: Date.now() }; }, true);
document.addEventListener('scores-changed', e => {
  const pts = e.detail?.points;
  // Toplu puanda (ör. doğru bilen bütün takımlar) yükseliş satırlarda gösterilir, düğmeden değil
  if (pts > 0 && !e.detail?.groupId && lastTap.el && Date.now() - lastTap.t < 1500) floatPoints(lastTap.el, `+${pts}`);
});

// Çevrimdışı durumunu izle: iniyorsa 3 sn'de bir sor, bitince bir kez haber ver
async function watchOffline() {
  const before = ctx.offline.state;
  ctx.offline = await offlineStatus().catch(() => ({ state: 'off' }));
  if (before === 'loading' && ctx.offline.state === 'ready') toast('Çevrimdışı hazır: bütün dosyalar tahtaya indi ✓');
  renderTopbar();
  document.dispatchEvent(new CustomEvent('offline-changed'));
  if (ctx.offline.state !== 'ready') setTimeout(watchOffline, 3000);
}

// Yerelde yalnız ?sw ile (denemede eski dosya gelmesin)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || new URLSearchParams(location.search).has('sw'))) {
  navigator.serviceWorker.register('../sw.js', { scope: '../' }).then(() => watchOffline()).catch(() => { /* desteklenmiyor: normal çalışır */ });
}
