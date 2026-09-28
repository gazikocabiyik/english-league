import { test, eq, ok } from './t.js';
import { readFileSync } from 'node:fs';
import { listFiles, versionOf } from '../scripts/precache.mjs';

// Okul ağı engellese de tahta uygulamayı kendi hafızasından açsın: sw.js içindeki liste diskteki dosyalarla aynı olmalı
test('çevrimdışı liste güncel (değişiklikten sonra: node scripts/precache.mjs)', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const files = JSON.parse(sw.match(/const FILES = (\[.*?\]);/s)[1]);
  const version = sw.match(/const VERSION = '([^']+)'/)[1];
  eq(files, listFiles());
  eq(version, versionOf(files));
});

test('liste uygulamanın giriş sayfalarını ve içeriği kapsar, notları kapsamaz', () => {
  const files = listFiles();
  for (const f of ['./', 'index.html', 'app/', 'app/index.html', 'app/app.js', 'app/config.js', 'app/styles/base.css']) ok(files.includes(f), f);
  ok(files.some(f => f.endsWith('.mp3')) && files.some(f => f.endsWith('.jpg')), 'ses ve foto');
  ok(!files.some(f => f.endsWith('.md')), 'md yok');
});
