// Ortak hazırlık: deneme verisi, sahte ses çalar, konsol hatası yakalama ve ekrana sığma ölçümü.
import { test as base, expect } from '@playwright/test';

// tests/seed.html ile aynı deneme şubeleri (11-L, 11-S, 12-Y)
export function seedState({ cls = '11-L', level = 'A1', unit = 1, lesson = 0 } = {}) {
  const team = (id, name, color) => ({ id, name, color });
  const kids = (prefix, names, n) => names.map((name, i) => ({ id: `${prefix}${i}`, name, teamId: `t${(i % n) + 1}` }));
  const today = new Date().toLocaleDateString('sv-SE');
  return {
    version: 1, events: [], attempts: [],
    classes: {
      '11-L': { teams: [team('t1', 'Lions', 'team-1'), team('t2', 'Eagles', 'team-2'), team('t3', 'Wolves', 'team-3')],
        students: kids('s', ['Ali', 'Berk', 'Can', 'Deniz', 'Ece', 'Fatih', 'Gizem', 'Hakan', 'İrem'], 3) },
      '11-S': { teams: [team('t1', 'Sharks', 'team-1'), team('t2', 'Tigers', 'team-2')], students: kids('k', ['Kaan', 'Lale', 'Mert', 'Nil'], 2) },
      '12-Y': { teams: [team('t1', 'Bulls', 'team-1'), team('t2', 'Hawks', 'team-2'), team('t3', 'Foxes', 'team-3')],
        students: kids('y', ['Oğuz', 'Pelin', 'Rüzgar', 'Selin', 'Tuna', 'Umut'], 3) },
    },
    settings: {
      classList: ['11-L', '11-S', '12-Y'], lastClass: cls, [`unit:${cls}`]: unit,
      [`level:${cls}`]: level, [`levelLesson:${cls}`]: `${unit}:${lesson + 1}`, [`levelSince:${cls}`]: Date.now(),
      [`lesson:${cls}:${unit}`]: { lesson, step: 0 },
      [`absent:${cls}`]: { day: today, ids: [] },
    },
  };
}

// Tarayıcı sesi otomasyonda çalmayabilir: kitap sesi yerine zamanı ilerleyen sahte çalar
const fakeAudio = () => {
  window.Audio = class extends EventTarget {
    constructor(src) { super(); this.src = src; this.paused = true; this.currentTime = 0; this.duration = 100; this.preload = ''; }
    play() { this.paused = false; this.dispatchEvent(new Event('play')); this.iv = setInterval(() => { this.currentTime += 0.2; this.dispatchEvent(new Event('timeupdate')); }, 200); return Promise.resolve(); }
    pause() { this.paused = true; clearInterval(this.iv); this.dispatchEvent(new Event('pause')); }
  };
  if ('speechSynthesis' in window) window.speechSynthesis.speak = () => {};
};

export const test = base.extend({
  // Her test temiz veriyle başlar; sayfa yenilenince veri korunur (yalnız ilk açılışta yazılır)
  seed: [{}, { option: true }],
  page: async ({ page, seed }, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
    page.on('console', m => {
      // Dış kaynak (yazı tipi, Supabase) erişilemezse uygulama yine çalışır: bunlar hata sayılmaz
      if (m.type() === 'error' && !/fonts\.g|supabase|Failed to load resource|ERR_/i.test(m.text())) errors.push(`console: ${m.text()}`);
    });
    await page.addInitScript(([state]) => {
      try { // çevrimdışı hata sayfasında depolama yok: sessizce geç
        if (!sessionStorage.getItem('e2e-seeded')) {
          localStorage.setItem('okul.v1', JSON.stringify(state));
          sessionStorage.setItem('e2e-seeded', '1');
        }
      } catch { /* yok */ }
    }, [seedState(seed)]);
    await page.addInitScript(fakeAudio);
    await use(page);
    expect(errors, 'konsol hatası olmamalı').toEqual([]);
  },
});

// Ekrana sığıyor mu: ana alan kaymıyor, yatay taşma yok
export async function expectFits(page) {
  const m = await page.evaluate(() => {
    const main = document.querySelector('main');
    return { over: main.scrollHeight - main.clientHeight, wide: document.documentElement.scrollWidth - innerWidth };
  });
  expect(m.over, 'içerik dikey taşmamalı (px)').toBeLessThanOrEqual(2);
  expect(m.wide, 'yatay taşma olmamalı (px)').toBeLessThanOrEqual(1);
}

// Öğe görünür ve tamamen ekranın içinde mi (alttan kesilmesin)
export async function expectOnScreen(locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const vp = locator.page().viewportSize();
  expect(box.y + box.height, 'ekranın altından taşmamalı').toBeLessThanOrEqual(vp.height + 1);
  expect(box.x + box.width, 'ekranın sağından taşmamalı').toBeLessThanOrEqual(vp.width + 1);
}

export { expect };
