import { test, eq, ok } from './t.js';
import { stepRoute, normalize, advance, lessonInfo } from '../app/core/lesson-plan.js';

const unit = {
  interview: { jobs: [] },
  lessons: [
    { title: 'Ders 1', steps: [{ type: 'attendance' }, { type: 'coach', phase: 'move' }, { type: 'book', id: 'b1' }, { type: 'exit' }] },
    { title: 'Ders 2', steps: [{ type: 'coach', phase: 'speak' }, { type: 'mission' }, { type: 'video', id: 'v1' }] },
  ],
};

test('ders planı: adım → adres', () => {
  eq(stepRoute({ type: 'attendance' }, unit), '#/today');
  eq(stepRoute({ type: 'coach', phase: 'move' }, unit), '#/game/coach-says/move');
  eq(stepRoute({ type: 'exit' }, unit), '#/game/coach-says/exit');
  eq(stepRoute({ type: 'mission' }, unit), '#/game/mock-interview');
  eq(stepRoute({ type: 'mission' }, { dj: {} }), '#/game/warmup-dj');
  eq(stepRoute({ type: 'mission' }, {}), null);
  eq(stepRoute({ type: 'video', id: 'v1' }, unit), '#/game/video/v1');
  eq(stepRoute({ type: 'book', id: 'b1' }, unit), '#/game/book-task/b1');
  eq(stepRoute({ type: 'song', id: 's1' }, unit), '#/game/song-break/s1');
  eq(stepRoute({ type: 'boss' }, unit), '#/game/boss-round');
});

test('ders planı: ilerleme dersin sonunda bir sonraki derse geçer, ünite sonunda biter', () => {
  let p = { lesson: 0, step: 0 };
  const seen = [];
  for (let k = 0; k < 10 && !p.unitDone; k++) { seen.push(`${p.lesson}.${p.step}`); p = advance(unit, p); }
  eq(seen, ['0.0', '0.1', '0.2', '0.3', '1.0', '1.1', '1.2']);
  eq(p.unitDone, true);
});

test('ders planı: ders bitince lessonDone işaretlenir', () => {
  const p = advance(unit, { lesson: 0, step: 3 });
  eq([p.lesson, p.step, p.lessonDone], [1, 0, true]);
});

test('ders planı: görev oyunu olmayan ünitede mission adımı atlanır', () => {
  const noMission = { lessons: [{ title: 'D', steps: [{ type: 'coach', phase: 'speak' }, { type: 'mission' }, { type: 'exit' }] }] };
  eq(advance(noMission, { lesson: 0, step: 0 }), { lesson: 0, step: 2, lessonDone: false, unitDone: false });
  eq(normalize(noMission, { lesson: 0, step: 1 }).step, 2);
});

test('ders planı: panel bilgisi', () => {
  const info = lessonInfo(unit, { lesson: 1, step: 1 });
  eq([info.number, info.total, info.title, info.stepIndex, info.steps.length], [2, 2, 'Ders 2', 1, 3]);
  eq(lessonInfo(unit, { lesson: 2, step: 0 }).unitDone, true);
  eq(lessonInfo({}, { lesson: 0, step: 0 }), null);
});

import { currentRoute } from '../app/core/lesson-plan.js';

test('ders planı: şu anki adımın adresi (yalnız bu ekran planı ilerletebilir) (inceleme)', () => {
  eq(currentRoute(unit, { lesson: 0, step: 1 }), '#/game/coach-says/move');
  eq(currentRoute(unit, { lesson: 1, step: 1 }), '#/game/mock-interview');
  eq(currentRoute(unit, { lesson: 5, step: 0 }), null);
});
