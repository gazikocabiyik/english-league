// Anlam merdiveni: cümledeki anlam taşıyan kelimeler ve Türkçeleri (cümledeki sırayla).
// Kaynak: maddenin kendi anahtarları (keys) + ünitenin kelime listesi (vocab.tr). Uzun eşleşme kısa olanı yutar.
const norm = t => t.toLocaleLowerCase('en').replace(/[’]/g, "'");
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function keyGlosses(text, unit, item = {}) {
  const src = norm(text);
  const cands = [
    ...(item.keys ?? []).map(k => ({ w: k.w, tr: k.tr })),
    ...(unit.vocab ?? []).filter(v => v.tr).map(v => ({ w: v.word, tr: v.tr })),
  ];
  const hits = [];
  for (const c of cands) {
    // Bütün kelime olarak; çoğul -s / -es de olur (Engineers → engineer)
    const m = new RegExp(`(^|[^a-z'])(${escape(norm(c.w))})(e?s)?(?![a-z])`).exec(src);
    if (m) hits.push({ ...c, start: m.index + m[1].length, end: m.index + m[1].length + m[2].length });
  }
  // Uzun olan önce yerleşir; çakışan kısa eşleşme atılır
  hits.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const kept = [];
  for (const h of hits) if (!kept.some(k => h.start < k.end && k.start < h.end) && !kept.some(k => k.w === h.w)) kept.push(h);
  return kept.sort((a, b) => a.start - b.start).map(({ w, tr }) => ({ w, tr }));
}
