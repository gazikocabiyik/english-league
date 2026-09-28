// Çevrimdışı açılış listesi: app/ altındaki bütün dosyalar + kök sayfa. sw.js'teki FILES ve VERSION'ı yeniler.
// Kullanım: node scripts/precache.mjs   (içerik ya da kod değişince; test eskimiş listeyi yakalar)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(dir).flatMap(n => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [relative(root, p).split('\\').join('/')];
});

export function listFiles() {
  const app = walk(join(root, 'app')).filter(f => !f.endsWith('.md') && !/(^|\/)\./.test(f)).sort();
  return ['./', 'index.html', 'app/', ...app];
}

export function versionOf(files) {
  const h = createHash('sha1');
  for (const f of files) if (!f.endsWith('/')) h.update(f).update(readFileSync(join(root, f)));
  return h.digest('hex').slice(0, 10);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = listFiles();
  const p = join(root, 'sw.js');
  const sw = readFileSync(p, 'utf8')
    .replace(/const VERSION = '[^']*';/, `const VERSION = '${versionOf(files)}';`)
    .replace(/const FILES = \[.*?\];/s, `const FILES = ${JSON.stringify(files)};`);
  writeFileSync(p, sw);
  console.log(`${files.length} dosya, sürüm ${versionOf(files)}`);
}
