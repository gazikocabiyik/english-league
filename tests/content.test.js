import { test, eq, ok } from './t.js';
import { validateUnit, loadUnit } from '../app/core/content.js';

const cmds = L => [
  { text: `Coach says: jump ${L}!`, safe: true, level: L }, { text: `Coach says: run ${L}!`, safe: true, level: L },
  { text: `Coach says: stop ${L}!`, safe: true, level: L }, { text: `Sit down ${L}!`, safe: false, level: L },
];
const good = () => ({
  grade: 11, unit: 1, title: 'Future Jobs',
  frames: { A1: ["He is a/an ___."], A2: ["I'm going to be a/an ___."], B1: ["When I finish school, I'm going to be a/an ___."] },
  vocab: [
    { word: 'coach', tr: 'antrenör', img: 'media/11/coach.jpg', frame: 0 },
    { word: 'pilot', tr: 'pilot', img: 'media/11/pilot.jpg', frame: 0 },
  ],
  commands: [...cmds('A1'), ...cmds('A2'), ...cmds('B1')],
});

test('content: geçerli ünite hatasız', () => eq(validateUnit(good()), []));

test('content: eksik alanlar okunur hata verir (RF3)', () => {
  const u = good();
  delete u.title;
  u.vocab[1].frame = 5;
  u.commands = u.commands.map(c => (c.level === 'B1' ? { ...c, safe: true } : c));
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('title')), 'title hatası yok');
  ok(errs.some(e => e.includes('pilot') && e.includes('frame')), 'frame hatası yok');
  ok(errs.some(e => e.includes('tuzak') && e.includes('B1')), 'tuzak hatası yok');
});

test('content: tek kelimelik ünite reddedilir (RF3)', () => {
  const u = good();
  u.vocab.length = 1;
  ok(validateUnit(u).some(e => e.includes('en az 2')));
});

test('content: null ve dizi olmayan alanlar çökertmez', () => {
  eq(validateUnit(null).length, 1);
  ok(validateUnit({ ...good(), vocab: 'x', frames: null, commands: {} }).length >= 3);
  ok(validateUnit({ ...good(), frames: ["I'm ___."] }).some(e => e.includes('frames')), 'eski dizi biçimi reddedilmeli');
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
  const r = await loadUnit(11, 1, async () => ({ ok: true, json: async () => ({ ...good(), frames: {} }) }));
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

test('content: yazım hatalı komut ve kelime alanları yakalanır (final I3)', () => {
  const u = good();
  u.commands = [{ txt: 'Coach says: run!', safe: true, level: 'A1' }, { text: 'Sit!', safe: 'no', level: 'A1' }, ...u.commands.slice(2)];
  u.vocab[0].word = 5;
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('commands[0]') && e.includes('text')), 'text hatası yok');
  ok(errs.some(e => e.includes('commands[1]') && e.includes('safe')), 'safe hatası yok');
  ok(errs.some(e => e.includes('vocab[0]') && e.includes('word')), 'word hatası yok');
});

test('content: seviye kalıpları paralel olmalı ve tek boşluk içermeli', () => {
  const u = good();
  u.frames.B1 = ['Two ___ and ___.', 'extra ___'];
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('B1') && e.includes('aynı sayıda')), 'uzunluk hatası yok');
  ok(errs.some(e => e.includes('B1') && e.includes('tek')), 'tek boşluk hatası yok');
});

test('content: komutun seviyesi geçerli olmalı, her seviyede en az 4 komut', () => {
  const u = good();
  u.commands[0].level = 'C1';
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('commands[0]') && e.includes('level')));
  ok(errs.some(e => e.includes('A1') && e.includes('en az 4')));
});

test('content: mülakat bölümü doğrulanır', () => {
  const u = good();
  const q = [{ q: "What's your name?", a: 'My name is ___.' }, { q: 'Do you want to be {job}?', a: 'Yes, I do.' }, { q: 'Are you strong?', a: 'Yes, I am.' }];
  u.interview = { jobs: ['coach', 'pilot'], questions: { A1: q, A2: q, B1: q } };
  eq(validateUnit(u), []);
  u.interview = { jobs: ['astronaut'], questions: { A1: q, A2: [{ q: 'x' }], B1: q } };
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('astronaut')), 'kelime listesinde olmayan meslek');
  ok(errs.some(e => e.includes('A2') && e.includes('en az 3')), 'A2 soru sayısı');
});

test('content: kazanım hedefleri ve DJ bölümü doğrulanır', () => {
  const u = good();
  u.goals = ['Gelecek planları'];
  u.dj = { genres: ['coach'], situations: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
    lines: { A1: { choose: 'I like ___.', reply: ['Me too!'] }, A2: { choose: 'I think ___.', reply: ['I agree.'] }, B1: { choose: 'I prefer ___.', reply: ['I see.'] } } };
  eq(validateUnit(u), []);
  u.goals = 'x';
  u.dj.genres = ['jazz'];
  u.dj.lines.B1 = { choose: 'no blank', reply: [] };
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('goals')));
  ok(errs.some(e => e.includes('jazz')));
  ok(errs.some(e => e.includes('dj.lines.B1')));
});

test('content: pilot ünitelerin hepsinde kazanım hedefi var', async () => {
  for (const [g, n] of [[11, 1], [11, 2], [12, 1], [12, 2]]) {
    const u = await readJson(`content/${g}/unit${n}.json`);
    ok(Array.isArray(u.goals) && u.goals.length > 0, `${g}/${n}`);
  }
});

test('content: 11/Ü1 mülakat havuzu her seviyede 12 soru, aday başına 3', async () => {
  const u = await readJson('content/11/unit1.json');
  eq(['A1', 'A2', 'B1'].map(L => u.interview.questions[L].length), [12, 12, 12]);
  eq(u.interview.perCandidate, 3);
});

test('content: ders planı, video, kitap ve şarkı referansları doğrulanır', () => {
  const u = good();
  const qs = { A1: [{ q: 'Q?', a: 'A.' }], A2: [{ q: 'Q?', a: 'A.' }], B1: [{ q: 'Q?', a: 'A.' }] };
  u.media = { videos: [{ id: 'v1', youtubeId: 'abc123DEF45', title: 'T', predict: 'P?', questions: qs }] };
  u.book = [{ id: 'b1', page: 13, title: 'T', instruction: 'I', items: [{ text: 'X.', answer: true }, { q: 'Y?', a: 'Z.' }] }];
  u.songs = [{ id: 's1', title: 'S', artist: 'A', lyricsTrainingUrl: 'https://lyricstraining.com/play/x', why: 'W' }];
  u.lessons = [{ title: 'Ders 1', steps: [{ type: 'attendance' }, { type: 'coach', phase: 'move' }, { type: 'video', id: 'v1' }, { type: 'book', id: 'b1' }, { type: 'song', id: 's1' }, { type: 'boss' }, { type: 'exit' }] }];
  eq(validateUnit(u), []);
  u.lessons[0].steps.push({ type: 'video', id: 'yok' }, { type: 'dance' }, { type: 'coach', phase: 'jump' });
  u.songs[0].lyricsTrainingUrl = 'http://evil.example';
  const errs = validateUnit(u);
  ok(errs.some(e => e.includes('yok')), 'olmayan video');
  ok(errs.some(e => e.includes('dance')), 'bilinmeyen adım');
  ok(errs.some(e => e.includes('jump')), 'bilinmeyen tur');
  ok(errs.some(e => e.includes('lyricstraining')), 'şarkı bağlantısı');
});

test('content: pilot 1. ünitelerde 4 derslik plan var', async () => {
  for (const g of [11, 12]) {
    const u = await readJson(`content/${g}/unit1.json`);
    eq(u.lessons?.length, 4, `${g}/1`);
  }
});
