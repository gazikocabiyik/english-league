// Her ekran tahtaya sığmalı: dikey/yatay taşma yok, asıl düğmeler görünür ve ekranın içinde.
import { test, expect, expectFits, expectOnScreen } from './fixtures.js';

const go = async (page, route) => { await page.goto(`/app/#/${route}`); await page.waitForLoadState('networkidle'); };

test.describe('11-L · ünite 1', () => {
  test('sınıf seçimi', async ({ page }) => {
    await go(page, '');
    await expect(page.getByRole('heading', { name: /hangi sınıf/i })).toBeVisible();
    await expectFits(page);
  });

  test('panel: ders kartı ve Derse başla', async ({ page }) => {
    await go(page, 'panel');
    await expectOnScreen(page.getByRole('button', { name: /derse başla/i }).first());
  });

  test('yoklama: takım seçme penceresi açılır', async ({ page }) => {
    await go(page, 'today');
    await expectFits(page);
    await page.getByRole('button', { name: 'Ali için takım seç' }).click();
    await expectOnScreen(page.getByRole('button', { name: 'Wolves' }));
  });

  for (const phase of ['move', 'speak', 'exit']) {
    test(`Coach Says · ${phase}`, async ({ page }) => {
      await go(page, `game/coach-says/${phase}`);
      await expect(page.locator('.stage')).toBeVisible();
      await expectFits(page);
      await expectOnScreen(page.getByRole('button', { name: 'Sonraki' }));
    });
  }

  test('kitap görevi: True/False oylama ekranı', async ({ page }) => {
    await go(page, 'game/book-task/b3');
    await expectFits(page);
    await page.getByRole('button', { name: /hazırız/i }).click();
    await expect(page.locator('.vote-row')).toHaveCount(3);
    await expectFits(page);
    await expectOnScreen(page.getByRole('button', { name: /cevabı aç/i }));
  });

  test('kitap görevi: kısa cevap (7 madde, telefon konuşması)', async ({ page }) => {
    await go(page, 'game/book-task/b6');
    await page.getByRole('button', { name: /hazırız/i }).click();
    await page.getByRole('button', { name: /cevabı göster/i }).click();
    await expectFits(page);
    await expectOnScreen(page.getByRole('button', { name: /puanları ver/i }));
  });

  test('kitap görevi: ses çalarken karaoke metni sığar', async ({ page }) => {
    await go(page, 'game/book-task/b3');
    await page.getByRole('button', { name: /hazırız/i }).click();
    await page.getByRole('button', { name: /audio 1\.1/i }).click();
    await expect(page.locator('.karaoke')).toBeVisible();
    await expect(page.locator('.kw.is-now')).toHaveCount(1);
    await expectFits(page);
    await expectOnScreen(page.getByRole('button', { name: /cevabı aç/i }));
  });

  test('Ön Kamp: üç bölüm', async ({ page }) => {
    await go(page, 'game/pre-season');
    await expect(page.locator('.donut')).toBeVisible();
    await expectFits(page);
    await page.getByRole('button', { name: /kelimelere geç/i }).click();
    await expectFits(page);
    for (let i = 0; i < 8; i++) await page.getByRole('button', { name: /sonraki|hazırlık ölçere geç/i }).click();
    await expectFits(page);
    await expectOnScreen(page.getByRole('button', { name: /sınıf bildi/i }));
  });

  test('Mock Interview', async ({ page }) => {
    await go(page, 'game/mock-interview');
    await expect(page.locator('.question').first()).toBeVisible();
    await expectFits(page);
  });

  test('video', async ({ page }) => {
    await go(page, 'game/video/v1');
    await expectFits(page);
  });

  test('şarkı molası', async ({ page }) => {
    await go(page, 'game/song-break/s1');
    await expectFits(page);
  });

  test('Boss Round', async ({ page }) => {
    await go(page, 'game/boss-round');
    await expect(page.locator('.boss-card')).toBeVisible();
    await expectFits(page);
    await expectOnScreen(page.getByRole('button', { name: /kimse bilemedi/i }));
  });

  test('lig', async ({ page }) => {
    await go(page, 'league');
    await expect(page.locator('main')).toContainText(/Lions|Eagles|Wolves/);
  });

  test('bulut ekranı', async ({ page }) => {
    await go(page, 'cloud');
    await expectOnScreen(page.getByRole('button', { name: 'Giriş yap', exact: true }));
  });
});

test.describe('12-Y · ünite 1', () => {
  test.use({ seed: { cls: '12-Y' } });
  test('Warm-up DJ', async ({ page }) => {
    await go(page, 'game/warmup-dj');
    await expect(page.locator('.genre').first()).toBeVisible();
    await expectFits(page);
  });
  test('Ön Kamp', async ({ page }) => {
    await go(page, 'game/pre-season');
    await expect(page.locator('.donut')).toBeVisible();
    await expectFits(page);
  });
});
