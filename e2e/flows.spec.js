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
