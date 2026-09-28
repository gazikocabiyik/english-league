// Ders ders ilerleyen seviye: bir dersteki sınıf doğruluğu %80 ve üstüyse sonraki ders bir üst seviyeden başlar.
// Altında kalırsa aynı seviyede kalır (düşürme yok); ders içinde seviye sabittir.
export const LEVELS = ['A1', 'A2', 'B1', 'B2'];
const MIN_TRIES = 8;  // bir dersi değerlendirmek için en az cevap
const PASS = 0.8;     // üst seviyeye geçme oranı

const idx = L => Math.max(0, LEVELS.indexOf(L));
export const levelUp = (L, n = 1) => LEVELS[Math.min(LEVELS.length - 1, idx(L) + n)];

// Dersteki bütün etkinlikler sınıfın seviyesinde
export function lessonLevels(L) {
  return { move: L, speak: L, interview: L, exit: L };
}

export function lessonRate(attempts) {
  return attempts.length ? attempts.filter(a => a.ok).length / attempts.length : 0;
}

export function levelAfterLesson(current, attempts) {
  if (attempts.length < MIN_TRIES) return current;
  return lessonRate(attempts) >= PASS ? levelUp(current) : current;
}

export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
