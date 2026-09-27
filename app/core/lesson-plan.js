// Ünitenin 4 derslik planı: her ders sıralı adımlar; bir etkinlik bitince plandaki sıradaki adıma geçilir.
export function stepRoute(step, unit) {
  switch (step?.type) {
    case 'attendance': return '#/today';
    case 'coach': return `#/game/coach-says/${step.phase ?? 'move'}`;
    case 'exit': return '#/game/coach-says/exit';
    case 'mission': return unit?.interview ? '#/game/mock-interview' : unit?.dj ? '#/game/warmup-dj' : null;
    case 'video': return `#/game/video/${step.id}`;
    case 'book': return `#/game/book-task/${step.id}`;
    case 'song': return `#/game/song-break/${step.id}`;
    case 'boss': return '#/game/boss-round';
    default: return null;
  }
}

const lessons = unit => (Array.isArray(unit?.lessons) ? unit.lessons : []);

// Oynatılamayan adımları (ör. görev oyunu olmayan ünitede "mission") atla
export function normalize(unit, { lesson = 0, step = 0 } = {}) {
  const L = lessons(unit);
  let l = lesson;
  let s = step;
  let lessonDone = false;
  while (l < L.length) {
    const steps = L[l].steps ?? [];
    while (s < steps.length && !stepRoute(steps[s], unit)) s++;
    if (s < steps.length) break;
    l++; s = 0; lessonDone = true;
  }
  return { lesson: l, step: s, lessonDone, unitDone: l >= L.length };
}

export function advance(unit, progress) {
  const next = normalize(unit, { lesson: progress.lesson, step: progress.step + 1 });
  return next;
}

export function lessonInfo(unit, progress) {
  const L = lessons(unit);
  if (!L.length) return null;
  const p = normalize(unit, progress);
  if (p.unitDone) return { unitDone: true, total: L.length, number: L.length };
  const ls = L[p.lesson];
  return { unitDone: false, number: p.lesson + 1, total: L.length, title: ls.title, steps: ls.steps, stepIndex: p.step, route: stepRoute(ls.steps[p.step], unit) };
}
