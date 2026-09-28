import { LEVELS as ALL_LEVELS } from './levels.js';

// Her ünitede zorunlu seviyeler; B2 isteğe bağlı (yoksa yüklerken B1'den doldurulur)
const LEVELS = ['A1', 'A2', 'B1'];
const levelsIn = obj => ALL_LEVELS.filter(L => obj?.[L] !== undefined);

// Kelimenin kalıbı: seviyeli (nesne) ya da eski düz dizi biçimi
// Kelimenin kendi cümlesi (say): metin ya da seviyeli nesne; o seviyede yoksa bir alttaki
export function sayFor(v, level = 'A2') {
  if (typeof v?.say === 'string') return v.say;
  if (!v?.say) return undefined;
  const order = ['A1', 'A2', 'B1', 'B2'];
  for (let i = order.indexOf(level); i >= 0; i--) if (v.say[order[i]]) return v.say[order[i]];
  return Object.values(v.say)[0];
}

export function frameFor(unit, index, level = 'A2') {
  const f = unit.frames;
  return Array.isArray(f) ? f[index] : (f?.[level] ?? f?.A2)?.[index];
}

const blanks = t => (typeof t === 'string' ? t.split('___').length - 1 : 0);

export function validateUnit(u) {
  if (!u || typeof u !== 'object') return ['Ünite dosyası boş veya bozuk.'];
  const errors = [];
  if (![11, 12].includes(u.grade)) errors.push('grade 11 ya da 12 olmalı.');
  if (!Number.isInteger(u.unit) || u.unit < 1 || u.unit > 10) errors.push('unit 1–10 arası olmalı.');
  if (typeof u.title !== 'string' || !u.title) errors.push('title eksik.');

  // frames: { A1: [...], A2: [...], B1: [...] } — paralel diziler, her kalıpta tek ___
  const f = u.frames && typeof u.frames === 'object' && !Array.isArray(u.frames) ? u.frames : null;
  const count = f && Array.isArray(f.A2) ? f.A2.length : 0;
  if (!f || !LEVELS.every(L => Array.isArray(f[L]) && f[L].length > 0)) {
    errors.push('frames, A1/A2/B1 anahtarlı ve her biri en az 1 kalıp içeren bir nesne olmalı.');
  } else {
    for (const L of levelsIn(f)) {
      if (!Array.isArray(f[L])) { errors.push(`frames.${L}: kalıp listesi olmalı.`); continue; }
      if (f[L].length !== count) errors.push(`frames.${L}: A2 ile aynı sayıda kalıp olmalı (${count}).`);
      f[L].forEach((t, i) => { if (blanks(t) !== 1) errors.push(`frames.${L}[${i}]: tek bir ___ boşluğu olmalı.`); });
    }
  }

  if (!Array.isArray(u.vocab) || u.vocab.length < 2) {
    errors.push('vocab en az 2 kelime içermeli.');
  } else {
    u.vocab.forEach((v, i) => {
      const label = `vocab[${i}] (${v?.word ?? '?'})`;
      if (typeof v?.word !== 'string' || !v.word) errors.push(`${label}: word eksik ya da metin değil.`);
      const hasImg = typeof v?.img === 'string' && v.img;
      const hasDef = typeof v?.def === 'string' && v.def;
      if (!hasImg && !hasDef) errors.push(`${label}: img ya da def (soyut kelimede tanım) gerekli.`);
      if (v?.level !== undefined && !ALL_LEVELS.includes(v.level)) errors.push(`${label}: level A1, A2, B1 ya da B2 olmalı.`);
      if (v?.lesson !== undefined && !(Number.isInteger(v.lesson) && v.lesson > 0)) errors.push(`${label}: lesson 1 ya da daha büyük tam sayı olmalı.`);
      if (v?.say !== undefined) {
        const says = typeof v.say === 'string' ? [v.say] : Object.values(v.say ?? {});
        if (!says.length || !says.every(t => blanks(t) === 1)) errors.push(`${label}: say cümlelerinde tek ___ olmalı.`);
      } else if (!Number.isInteger(v?.frame) || v.frame < 0 || v.frame >= count) errors.push(`${label}: frame numarası geçersiz.`);
    });
  }

  if (!Array.isArray(u.commands) || !u.commands.length) {
    errors.push('commands en az 1 komut içermeli.');
  } else {
    u.commands.forEach((c, i) => {
      if (typeof c?.text !== 'string' || !c.text) errors.push(`commands[${i}]: text eksik ya da metin değil.`);
      if (typeof c?.safe !== 'boolean') errors.push(`commands[${i}]: safe true ya da false olmalı.`);
      if (!ALL_LEVELS.includes(c?.level)) errors.push(`commands[${i}]: level A1, A2, B1 ya da B2 olmalı.`);
    });
    for (const L of [...LEVELS, ...(u.commands.some(c => c?.level === 'B2') ? ['B2'] : [])]) {
      const mine = u.commands.filter(c => c?.level === L);
      if (mine.length < 4) errors.push(`commands: ${L} seviyesinde en az 4 komut olmalı.`);
      else if (!mine.some(c => c.safe === false)) errors.push(`commands: ${L} seviyesinde en az 1 tuzak komut (safe: false) olmalı.`);
    }
  }

  if (u.interview !== undefined) {
    const iv = u.interview;
    const words = new Set((u.vocab ?? []).map(v => v?.word));
    if (!Array.isArray(iv?.jobs) || !iv.jobs.length) errors.push('interview.jobs en az 1 meslek içermeli.');
    else iv.jobs.filter(j => !words.has(j)).forEach(j => errors.push(`interview.jobs: "${j}" kelime listesinde yok.`));
    for (const L of [...LEVELS, ...(iv?.questions?.B2 ? ['B2'] : [])]) {
      const qs = iv?.questions?.[L];
      if (!Array.isArray(qs) || qs.length < 3) { errors.push(`interview.questions.${L}: en az 3 soru olmalı.`); continue; }
      qs.forEach((x, i) => {
        if (typeof x?.q !== 'string' || typeof x?.a !== 'string' || !x.q || !x.a) errors.push(`interview.questions.${L}[${i}]: q ve a metin olmalı.`);
      });
    }
  }
  if (u.goals !== undefined && !(Array.isArray(u.goals) && u.goals.every(g => typeof g === 'string' && g))) {
    errors.push('goals: ünite kazanımları metin listesi olmalı.');
  }
  if (u.dj !== undefined) {
    const dj = u.dj;
    const words = new Set((u.vocab ?? []).map(v => v?.word));
    if (!Array.isArray(dj?.genres) || !dj.genres.length) errors.push('dj.genres en az 1 tür içermeli.');
    else dj.genres.filter(g => !words.has(g)).forEach(g => errors.push(`dj.genres: "${g}" kelime listesinde yok.`));
    if (!Array.isArray(dj?.situations) || dj.situations.length < 3 || !dj.situations.every(x => typeof x?.text === 'string' && x.text)) errors.push('dj.situations en az 3 durum (text) içermeli.');
    for (const L of [...LEVELS, ...(dj?.lines?.B2 ? ['B2'] : [])]) {
      const l = dj?.lines?.[L];
      if (blanks(l?.choose) !== 1 || !Array.isArray(l?.reply) || !l.reply.length) errors.push(`dj.lines.${L}: choose tek ___ içermeli, reply en az 1 cümle olmalı.`);
    }
  }
  // Derse özel çıkış bileti: { "1": { "A1": [ {word} | {q, a} | {idiom, q, a} ] } }
  if (u.exits !== undefined) {
    const words = new Set((u.vocab ?? []).map(v => v?.word));
    for (const [n, byLevel] of Object.entries(u.exits ?? {})) for (const [L, items] of Object.entries(byLevel ?? {})) {
      if (!ALL_LEVELS.includes(L) || !Array.isArray(items) || !items.length) { errors.push(`exits.${n}.${L}: seviye A1–B2 olmalı ve en az 1 madde içermeli.`); continue; }
      items.forEach((x, i) => {
        const at = `exits.${n}.${L}[${i}]`;
        if (x?.word !== undefined) { if (!words.has(x.word)) errors.push(`${at}: "${x.word}" kelime listesinde yok.`); }
        else if (typeof x?.q !== 'string' || typeof x?.a !== 'string' || !x.q || !x.a) errors.push(`${at}: {word} ya da {q, a} olmalı.`);
      });
    }
  }
  if (u.interview?.byLesson !== undefined) {
    for (const [n, byLevel] of Object.entries(u.interview.byLesson ?? {})) for (const [L, qs] of Object.entries(byLevel ?? {})) {
      if (!Array.isArray(qs) || qs.length < 3 || !qs.every(x => typeof x?.q === 'string' && typeof x?.a === 'string')) errors.push(`interview.byLesson.${n}.${L}: en az 3 {q, a} olmalı.`);
    }
  }
  (u.book ?? []).forEach((b, i) => {
    if (b?.audio !== undefined && !/^audio\/[\w.-]+\.mp3$/.test(b.audio)) errors.push(`book[${i}].audio: "audio/…mp3" biçiminde ünite klasöründeki dosya olmalı.`);
  });
  // Ders planı ve ek içerik (video, kitap görevi, şarkı)
  const ids = key => new Set((Array.isArray(u[key]) ? u[key] : []).map(x => x?.id));
  const videos = new Set((u.media?.videos ?? []).map(v => v?.id));
  (u.media?.videos ?? []).forEach((v, i) => {
    if (!/^[\w-]{11}$/.test(v?.youtubeId ?? '')) errors.push(`media.videos[${i}]: youtubeId 11 karakterlik YouTube kimliği olmalı.`);
    if (!v?.predict || !v?.title) errors.push(`media.videos[${i}]: title ve predict gerekli.`);
    if (!LEVELS.some(L => Array.isArray(v?.questions?.[L]) && v.questions[L].length)) errors.push(`media.videos[${i}]: en az bir seviyede soru olmalı.`);
  });
  (u.book ?? []).forEach((b, i) => {
    if (!Number.isInteger(b?.page) || !Array.isArray(b?.items) || !b.items.length) errors.push(`book[${i}]: page (sayı) ve items gerekli.`);
    else b.items.forEach((it, k) => {
      const tf = typeof it?.text === 'string' && typeof it?.answer === 'boolean';
      const qa = typeof it?.q === 'string' && typeof it?.a === 'string';
      if (!tf && !qa) errors.push(`book[${i}].items[${k}]: {text, answer: true/false} ya da {q, a} olmalı.`);
    });
  });
  (u.songs ?? []).forEach((x, i) => {
    if (!String(x?.lyricsTrainingUrl ?? '').startsWith('https://lyricstraining.com/')) errors.push(`songs[${i}]: lyricsTrainingUrl https://lyricstraining.com/ ile başlamalı.`);
  });
  (u.media?.videos ?? []).forEach((v, i) => {
    if (!Array.isArray(v?.questions?.A2) || !v.questions.A2.length) errors.push(`media.videos[${i}]: A2 soruları gerekli (seviye bulunamazsa A2 kullanılır).`);
    for (const L of ALL_LEVELS) (v?.questions?.[L] ?? []).forEach((x, k) => {
      if (typeof x?.q !== 'string' || typeof x?.a !== 'string') errors.push(`media.videos[${i}].questions.${L}[${k}]: q ve a metin olmalı.`);
    });
  });
  (u.book ?? []).forEach((b, i) => { if (!b?.title || !b?.instruction) errors.push(`book[${i}]: title ve instruction gerekli.`); });
  (u.songs ?? []).forEach((x, i) => {
    if (!x?.title || !x?.artist || !x?.why) errors.push(`songs[${i}]: title, artist ve why gerekli.`);
    if (x?.minutes !== undefined && !(Number.isFinite(x.minutes) && x.minutes > 0)) errors.push(`songs[${i}]: minutes pozitif sayı olmalı.`);
  });
  (u.lessons ?? []).forEach((l, i) => { if (typeof l?.title !== 'string' || !l.title) errors.push(`lessons[${i}]: title gerekli.`); });
  if (u.interview && u.interview.perCandidate !== undefined && !(Number.isInteger(u.interview.perCandidate) && u.interview.perCandidate > 0)) errors.push('interview.perCandidate pozitif tam sayı olmalı.');
  const TYPES = ['attendance', 'coach', 'mission', 'video', 'book', 'song', 'boss', 'exit'];
  (u.lessons ?? []).forEach((l, li) => (l?.steps ?? []).forEach((st, si) => {
    const at = `lessons[${li}].steps[${si}]`;
    if (!TYPES.includes(st?.type)) errors.push(`${at}: bilinmeyen adım "${st?.type}".`);
    if (st?.type === 'coach' && !['move', 'speak', 'exit'].includes(st.phase)) errors.push(`${at}: bilinmeyen tur "${st.phase}".`);
    if (st?.type === 'video' && !videos.has(st.id)) errors.push(`${at}: video "${st.id}" yok.`);
    if (st?.type === 'book' && !ids('book').has(st.id)) errors.push(`${at}: kitap görevi "${st.id}" yok.`);
    if (st?.type === 'song' && !ids('songs').has(st.id)) errors.push(`${at}: şarkı "${st.id}" yok.`);
  }));
  return errors;
}

// B2 içeriği yazılmamış ünitede B2'ye çıkan sınıf B1 içeriğiyle oynar
export function withB2(u) {
  const x = structuredClone(u);
  const fill = obj => { if (obj && obj.B2 === undefined && obj.B1 !== undefined) obj.B2 = obj.B1; };
  if (x.frames && !Array.isArray(x.frames)) fill(x.frames);
  fill(x.interview?.questions);
  fill(x.dj?.lines);
  for (const v of x.media?.videos ?? []) fill(v.questions);
  if (Array.isArray(x.commands) && !x.commands.some(c => c.level === 'B2')) {
    x.commands.push(...x.commands.filter(c => c.level === 'B1').map(c => ({ ...c, level: 'B2' })));
  }
  return x;
}

export async function loadIndex(fetchFn = fetch) {
  try {
    const r = await fetchFn('content/index.json');
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

export async function loadUnit(grade, unit, fetchFn = fetch) {
  const path = `content/${grade}/unit${unit}.json`;
  try {
    const r = await fetchFn(path);
    if (!r.ok) return { unit: null, errors: [`${path} bulunamadı.`] };
    const u = await r.json();
    const errors = validateUnit(u);
    return { unit: errors.length ? null : withB2(u), errors };
  } catch (e) {
    return { unit: null, errors: [`Ünite yüklenemedi: ${e.message}`] };
  }
}
