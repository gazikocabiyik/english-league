export function buildRoster(namesText, teamCount, prev = { teams: [], students: [] }, newId = () => crypto.randomUUID()) {
  const names = [...new Set(namesText.split('\n').map(n => n.trim()).filter(Boolean))];
  const teams = Array.from({ length: teamCount }, (_, i) => {
    const id = `t${i + 1}`;
    const old = prev.teams.find(t => t.id === id);
    return { id, name: old?.name ?? `Team ${String.fromCharCode(65 + i)}`, color: `team-${i + 1}` };
  });
  const students = names.map((name, i) => {
    const old = prev.students.find(s => s.name === name);
    const keepTeam = old && teams.some(t => t.id === old.teamId);
    return { id: old?.id ?? newId(), name, teamId: keepTeam ? old.teamId : teams[i % teamCount].id };
  });
  return { teams, students };
}
