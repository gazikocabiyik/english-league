// crypto.randomUUID yalnız güvenli (https/localhost) adreslerde var; yoksa basit kimlik
const uid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

export function buildRoster(namesText, teamCount, prev = { teams: [], students: [] }, newId = uid) {
  // Aynı isim iki kez yazılırsa ikinci öğrenci "Ad (2)" olur (gerçekten iki Mehmet olabilir)
  const seen = new Map();
  const names = namesText.split('\n').map(n => n.trim()).filter(Boolean).map(n => {
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return k === 1 ? n : `${n} (${k})`;
  });
  const teams = Array.from({ length: teamCount }, (_, i) => {
    const id = `t${i + 1}`;
    const old = prev.teams.find(t => t.id === id);
    return { id, name: old?.name ?? `Team ${String.fromCharCode(65 + i)}`, color: `team-${i + 1}` };
  });
  // Önce isimle eşleştir; eşleşmeyen yeni isim aynı satırdaki eşleşmeyen eski öğrencinin kimliğini alır (yeniden adlandırma)
  const byName = new Map(prev.students.map(s => [s.name, s]));
  const used = new Set(names.filter(n => byName.has(n)).map(n => byName.get(n).id));
  const students = names.map((name, i) => {
    let old = byName.get(name);
    if (!old) {
      const sameRow = prev.students[i];
      if (sameRow && !used.has(sameRow.id) && !names.includes(sameRow.name)) { old = sameRow; used.add(sameRow.id); }
    }
    const keepTeam = old && teams.some(t => t.id === old.teamId);
    return { id: old?.id ?? newId(), name, teamId: keepTeam ? old.teamId : teams[i % teamCount].id };
  });
  return { teams, students };
}

// Günlük gruplar: o gün gelenler gruplara en fazla 1 fark olacak şekilde, en az taşımayla dağılır.
export function balanceTeams(students, teams, absentIds = []) {
  if (!teams.length) return students;
  const absent = new Set(absentIds);
  const out = students.map(s => ({ ...s }));
  const valid = new Set(teams.map(t => t.id));
  const present = () => out.filter(s => !absent.has(s.id));
  const size = id => present().filter(s => s.teamId === id).length;
  const smallest = () => teams.reduce((a, t) => (size(t.id) < size(a.id) ? t : a));
  const largest = () => teams.reduce((a, t) => (size(t.id) > size(a.id) ? t : a));
  // Grubu geçersiz her öğrenci (gelmeyenler dahil) bir gruba alınır; yoksa yoklama ekranında görünmez
  for (const s of out) if (!valid.has(s.teamId)) s.teamId = smallest().id;
  while (size(largest().id) - size(smallest().id) > 1) {
    const from = largest().id;
    const to = smallest().id;
    present().filter(s => s.teamId === from).at(-1).teamId = to;
  }
  // değişmeyen öğrenciler aynı nesne kalsın
  return out.map((s, i) => (s.teamId === students[i].teamId ? students[i] : s));
}

// Öğrenciyi sıradaki gruba geçir (sondan başa döner)
export function moveStudent(students, teams, id) {
  return students.map(s => {
    if (s.id !== id) return s;
    const i = teams.findIndex(t => t.id === s.teamId);
    return { ...s, teamId: teams[(i + 1) % teams.length].id };
  });
}
