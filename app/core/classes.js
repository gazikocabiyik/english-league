// Şubeler öğretmence oluşturulur: "<sınıf>-<şube>", örn. 11-L, 12-SPOR.
export const GRADES = [11, 12];

export function makeClassId(grade, section) {
  if (!GRADES.includes(Number(grade))) throw new Error('Sınıf 11 ya da 12 olmalı.');
  const s = String(section).trim().toLocaleUpperCase('tr');
  if (!/^[A-ZÇĞİÖŞÜ0-9]{1,5}$/u.test(s)) throw new Error('Şube adı 1–5 harf/rakam olmalı (örn. L, S, A).');
  return `${Number(grade)}-${s}`;
}

export function sortClassIds(ids) {
  return [...ids].sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));
}
