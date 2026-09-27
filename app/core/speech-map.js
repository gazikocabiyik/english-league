// Önceden üretilmiş doğal seslerin (Kokoro) metin → dosya eşlemesi.
export function speechKey(text) {
  return String(text).trim().replace(/\s+/g, ' ').toLowerCase();
}

export function audioFor(manifest, text) {
  const file = manifest?.[speechKey(text)];
  return file ? `content/${file}` : null;
}
