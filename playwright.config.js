// Tahta testleri: uygulama gerçek Chrome'da iki tahta boyutunda açılır; taşma, görünmeyen düğme ve konsol hatası aranır.
// Çalıştırma: npm run test:e2e   (rapor: npx playwright show-report)
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:8790',
    channel: 'chrome', // bilgisayardaki Chrome (ayrı tarayıcı indirilmez)
    actionTimeout: 10_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Windows ölçekli akıllı tahta: tarayıcı çubuklarıyla kalan alan
    { name: 'tahta-1280x600', use: { viewport: { width: 1280, height: 600 } } },
    { name: 'tahta-1920x1080', use: { viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: {
    command: 'python3 -m http.server 8790',
    url: 'http://localhost:8790/app/',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
