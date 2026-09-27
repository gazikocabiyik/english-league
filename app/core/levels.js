// Uyarlanır seviye: ders içinde A1 → A2 → B1 artar; ders sonunda sınıfın seviyesi ölçülür.
export const LEVELS = ['A1', 'A2', 'B1'];
const MIN_TRIES = 5;   // bir seviyeyi değerlendirmek için en az deneme
const PASS = 0.7;      // geçme oranı
const FAIL = 0.4;      // bu oranın altı bir alt seviyeye indirir

const idx = L => Math.max(0, LEVELS.indexOf(L));
export const levelUp = (L, n = 1) => LEVELS[Math.min(LEVELS.length - 1, idx(L) + n)];

// Sınıf seviyesi L ise: Coach Says L'de, Mock Interview L+1'de, çıkış bileti L+2'de.
export function lessonLevels(L) {
  return { move: L, speak: L, interview: levelUp(L, 1), exit: levelUp(L, 2) };
}

export function nextLevel(current, attempts) {
  const stat = Object.fromEntries(LEVELS.map(L => [L, { n: 0, ok: 0 }]));
  for (const a of attempts) if (stat[a.level]) { stat[a.level].n++; if (a.ok) stat[a.level].ok++; }
  const rate = L => stat[L].ok / stat[L].n;
  const cur = idx(current);
  if (stat[LEVELS[cur]].n >= MIN_TRIES && rate(LEVELS[cur]) < FAIL) return LEVELS[Math.max(0, cur - 1)];
  const passed = LEVELS.map((L, i) => (stat[L].n >= MIN_TRIES && rate(L) >= PASS ? i : -1));
  // Bir derste en fazla bir seviye yükselir (tek derste A1 → B1 sıçraması olmaz)
  return LEVELS[Math.min(cur + 1, Math.max(cur, ...passed))];
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
