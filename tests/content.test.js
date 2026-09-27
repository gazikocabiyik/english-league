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
