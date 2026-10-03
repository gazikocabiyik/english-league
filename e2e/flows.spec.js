// Davranış: takım oylaması puanları doğru dağıtır; uygulama internet yokken (okul ağı engeli) açılır.
import { test, expect } from './fixtures.js';

const state = page => page.evaluate(() => JSON.parse(localStorage.getItem('okul.v1')));

test('True/False: doğru bilen bütün takımlar +1, aynı grup', async ({ page }) => {
  await page.goto('/app/#/game/book-task/b3');
  await page.getByRole('button', { name: /hazırız/i }).click();
  const rows = page.locator('.vote-row');
  await rows.nth(0).getByRole('button', { name: 'TRUE' }).click();  // doğru
  await rows.nth(1).getByRole('button', { name: 'FALSE' }).click(); // yanlış
  await rows.nth(2).getByRole('button', { name: 'TRUE' }).click();  // doğru
  await page.getByRole('button', { name: /cevabı aç/i }).click();
  await expect(page.locator('.stamp-answer')).toHaveText('TRUE');
  const s = await state(page);
  expect(s.events.map(e => e.targetId).sort()).toEqual(['t1', 't3']);
  expect(new Set(s.events.map(e => e.groupId)).size).toBe(1);
  expect(s.attempts.map(a => a.ok)).toEqual([true, false, true]);
});

test('kısa cevap: yalnız ✓ alan takım puan alır, işaretsiz takım sayılmaz', async ({ page }) => {
  await page.goto('/app/#/game/book-task/b6');
  await page.getByRole('button', { name: /hazırız/i }).click();
  const rows = page.locator('.vote-row');
  await rows.nth(0).getByRole('button', { name: /doğru/i }).click();
  await rows.nth(1).getByRole('button', { name: /yanlış/i }).click();
  await page.getByRole('button', { name: /puanları ver/i }).click();
  const s = await state(page);
  expect(s.events.map(e => e.targetId)).toEqual(['t1']);
  expect(s.attempts.map(a => a.ok)).toEqual([true, false]);
});

test('çevrimdışı: dosyalar indikten sonra internet yokken uygulama açılır', async ({ page, context }) => {
  test.setTimeout(120_000);
  await page.goto('/app/?sw#/');
  // Service Worker etkin ve dosyalar indi mi (async değerlendirme expect.poll ile beklenir)
  await expect.poll(() => page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    if (r?.active?.state !== 'activated') return 0;
    const c = (await caches.keys()).find(k => k.startsWith('el-') && k !== 'el-runtime');
    return c ? (await (await caches.open(c)).keys()).length : 0;
  }), { timeout: 100_000, intervals: [1000] }).toBeGreaterThan(1000);
  await page.goto('/app/?sw#/'); // artık Service Worker'ın kontrolünde açılır
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /hangi sınıf/i })).toBeVisible();
  await context.setOffline(false);
});

test('güncelleme: eski biçimdeki sınıf verisi kaybolmadan açılır ve günlük yedek alınır', async ({ browser }) => {
  const page = await browser.newPage(); // deneme verisi olmadan: pilot sınıfın eski kaydı
  const t = Date.now() - 86_400_000;
  await page.addInitScript(old => { if (!sessionStorage.getItem('x')) { localStorage.setItem('okul.v1', JSON.stringify(old)); sessionStorage.setItem('x', '1'); } }, {
    version: 1,
    classes: { '11-D': { teams: [{ id: 't1', name: 'Lions', color: 'team-1' }, { id: 't2', name: 'Eagles', color: 'team-2' }], students: [{ id: 's1', name: 'Berra', teamId: 't1' }] } },
    events: [{ id: 'e1', classId: '11-D', targetType: 'team', targetId: 't1', points: 7, reason: 'Coach Says', ts: t }],
    attempts: [{ id: 'a1', classId: '11-D', level: 'A1', ok: true, activity: 'speak', ts: t }],
    settings: { classList: ['11-D'], lastClass: '11-D', 'unit:11-D': 1, 'level:11-D': 'A1', 'levelDay:11-D': '2026-09-28', 'lesson:11-D:1': { lesson: 2, step: 3 } },
  });
  await page.goto('/app/#/league');
  await expect(page.locator('.row', { hasText: 'Lions' })).toContainText('7');
  const snap = await page.evaluate(() => JSON.parse(localStorage.getItem('okul.v1.gunluk')));
  expect(JSON.parse(snap.data).events[0].points).toBe(7);
  await page.close();
});
