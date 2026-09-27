// Şanslı öğrenci: çıkış biletinde her kelimeye bir öğrenci seçer.
// En az seçilenler önce; eşitlikte en uzun süredir beklenenler; kalan eşitlikte rastgele.
export function createPicker(students, { excludeIds = [], rng = Math.random } = {}) {
  const count = new Map(students.map(s => [s.id, 0]));
  const lastSeq = new Map(students.map(s => [s.id, -1]));
  for (const id of excludeIds) if (count.has(id)) { count.set(id, 1); lastSeq.set(id, 0); } // bugün seçilmişler
  let seq = 1;
  let current = null;

  function choose(skipId) {
    const pool = students.filter(s => s.id !== skipId);
    if (!pool.length) return students[0] ?? null;
    const key = s => [count.get(s.id), lastSeq.get(s.id)];
    const [c0, s0] = pool.map(key).sort((a, b) => a[0] - b[0] || a[1] - b[1])[0];
    const ties = pool.filter(s => count.get(s.id) === c0 && lastSeq.get(s.id) === s0);
    return ties[Math.floor(rng() * ties.length)];
  }

  function take(s) {
    if (!s) return null;
    count.set(s.id, count.get(s.id) + 1);
    lastSeq.set(s.id, seq++);
    current = { student: s, prevSeq: lastSeq.get(s.id) };
    return s;
  }

  return {
    get current() { return current?.student ?? null; },
    pick() {
      if (!students.length) return null;
      const prev = current?.student;
      return take(choose(students.length > 1 ? prev?.id : undefined));
    },
    // "Başka öğrenci": şimdiki seçim sayılmaz, öğrenci bekleyenlerden sonra yine sıraya girer
    skip() {
      if (!current) return this.pick();
      const s = current.student;
      count.set(s.id, count.get(s.id) - 1);
      lastSeq.set(s.id, seq++); // en son sıraya: bekleyenlerden sonra gelir
      return take(choose(students.length > 1 ? s.id : undefined));
    },
  };
}
