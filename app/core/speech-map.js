// Önceden üretilmiş doğal seslerin (Kokoro) metin → dosya eşlemesi.
export function speechKey(text) {
  return String(text).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function audioFor(manifest, text) {
  const file = manifest?.[speechKey(text)];
  return file ? `content/${file}` : null;
}

// Cümle kalıbını kelimeyle doldurur. scripts/text_rules.py fill_frame ile birebir aynı olmalı.
export function fillFrame(text, word) {
  const article = /^[aeiou]/i.test(word) ? 'an' : 'a';
  return text
    .replace('a/an ___', `${article} ___`)
    .replace('___', word)
    .replace(/\s+is\s*…\s*$/, '.')
    .replace(/\s*…\s*$/, '');
}
