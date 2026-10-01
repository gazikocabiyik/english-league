// Ön Kamp pasta grafiği: A2 iletişim işlevlerinin yüzde kaçı karşılanıyor (önceki üniteler + bu ünite).
// functions: [{ id }] · prior: önceki ünitelerin işlev listeleri · mine: bu ünitenin işlevleri
export function coverage(functions, prior, mine) {
  const ids = new Set(functions.map(f => f.id));
  if (!ids.size) return { before: 0, after: 0, added: 0 };
  const before = new Set(prior.flat().filter(id => ids.has(id)));
  const after = new Set([...before, ...mine.filter(id => ids.has(id))]);
  const pct = n => Math.round((n / ids.size) * 100);
  return { before: pct(before.size), after: pct(after.size), added: pct(after.size) - pct(before.size) };
}
