export function validateUnit(u) {
  if (!u || typeof u !== 'object') return ['Ünite dosyası boş veya bozuk.'];
  const errors = [];
  if (![11, 12].includes(u.grade)) errors.push('grade 11 ya da 12 olmalı.');
  if (!Number.isInteger(u.unit) || u.unit < 1 || u.unit > 10) errors.push('unit 1–10 arası olmalı.');
  if (typeof u.title !== 'string' || !u.title) errors.push('title eksik.');
  const frames = Array.isArray(u.frames) ? u.frames : [];
  if (!frames.length) errors.push('frames en az 1 cümle kalıbı içermeli.');
  if (!Array.isArray(u.vocab) || u.vocab.length < 2) {
    errors.push('vocab en az 2 kelime içermeli.');
  } else {
    u.vocab.forEach((v, i) => {
      const label = `vocab[${i}] (${v?.word ?? '?'})`;
      if (typeof v?.word !== 'string' || !v.word) errors.push(`${label}: word eksik ya da metin değil.`);
      if (typeof v?.img !== 'string' || !v.img) errors.push(`${label}: img eksik ya da metin değil.`);
      if (!Number.isInteger(v?.frame) || typeof frames[v.frame] !== 'string') errors.push(`${label}: frame numarası geçersiz.`);
    });
  }
  if (!Array.isArray(u.commands) || !u.commands.length) {
    errors.push('commands en az 1 komut içermeli.');
  } else {
    u.commands.forEach((c, i) => {
      if (typeof c?.text !== 'string' || !c.text) errors.push(`commands[${i}]: text eksik ya da metin değil.`);
      if (typeof c?.safe !== 'boolean') errors.push(`commands[${i}]: safe true ya da false olmalı.`);
    });
    if (!u.commands.some(c => c?.safe === false)) errors.push('commands içinde en az 1 tuzak komut (safe: false) olmalı.');
  }
  return errors;
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
    return { unit: errors.length ? null : u, errors };
  } catch (e) {
    return { unit: null, errors: [`Ünite yüklenemedi: ${e.message}`] };
  }
}
