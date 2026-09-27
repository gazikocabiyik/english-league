import { test, eq, ok } from './t.js';
import { createInterview, fillJob } from '../app/modules/mock-interview/interview.js';
import { seeded } from './coach.test.js';

const unit = {
  vocab: ['engineer', 'pilot', 'coach'].map(w => ({ word: w, tr: w, img: `m/${w}.jpg`, frame: 0 })),
  interview: {
    jobs: ['engineer', 'pilot', 'coach'],
    questions: {
      A1: [{ q: "What's your name?", a: 'My name is ___.' }, { q: 'Do you want to be {job}?', a: 'Yes, I do.' }, { q: 'Are you strong?', a: 'Yes, I am.' }],
      A2: [{ q: 'What job do you want?', a: "I'm going to be {job}." }, { q: 'Why?', a: 'Because I like ___.' }, { q: 'Team?', a: 'Yes, I can.' }],
      B1: [{ q: 'Why {job}?', a: 'I want to be {job} because ___.' }, { q: 'Five years?', a: 'In five years, I will ___.' }, { q: 'Pressure?', a: 'Yes, I can.' }],
    },
  },
};
const teams = [{ id: 't1', name: 'Lions' }, { id: 't2', name: 'Eagles' }];
const students = [
  { id: 's1', name: 'Ali', teamId: 't1' }, { id: 's2', name: 'Berk', teamId: 't1' },
  { id: 's3', name: 'Can', teamId: 't2' }, { id: 's4', name: 'Deniz', teamId: 't2' },
];

test('interview: {job} a/an ile doldurulur', () => {
  eq(fillJob('Do you want to be {job}?', 'engineer'), 'Do you want to be an engineer?');
  eq(fillJob("I'm going to be {job}.", 'pilot'), "I'm going to be a pilot.");
  eq(fillJob('My name is ___.', 'pilot'), 'My name is ___.');
});

test('interview: ikili farklı takımlardan seçilir', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const iv = createInterview(unit, { level: 'A2', students, teams, rng: seeded(seed) });
    ok(iv.pair.interviewer.teamId !== iv.pair.candidate.teamId, `seed ${seed}`);
  }
});

test('interview: tek takımda aynı takımdan iki farklı öğrenci; azsa ikili yok', () => {
  const one = students.filter(s => s.teamId === 't1');
  const iv = createInterview(unit, { level: 'A1', students: one, teams, rng: seeded(3) });
  ok(iv.pair.interviewer.id !== iv.pair.candidate.id);
  eq(createInterview(unit, { level: 'A1', students: one.slice(0, 1), teams }).pair, null);
  eq(createInterview(unit, { level: 'A1', students: [], teams }).pair, null);
});

test('interview: seviye soruları, meslekle doldurulmuş soru/cevap, ilerleme', () => {
  const iv = createInterview(unit, { level: 'B1', students, teams, rng: seeded(5) });
  eq(iv.total, 3);
  const job = iv.job.word;
  // soru sırası rastgele: meslekli soruyu bul
  const seen = [];
  for (let k = 0; k < 3; k++) { seen.push(iv.question()); iv.next(); }
  const withJob = seen.find(x => x.q.startsWith('Why'));
  ok(withJob.q.endsWith(`${job}?`));
  eq(withJob.a, `I want to be ${/^[aeiou]/.test(job) ? 'an' : 'a'} ${job} because ___.`);
  while (iv.index > 0) iv.prev();
  iv.prev(); // HIRED'dan dönüş olmayan durumda etkisiz
  ok(!iv.done);
  ok(iv.next()); ok(iv.next()); eq(iv.next(), false);
  ok(iv.done);
  ok(iv.prev());
});

test('interview: meslekler hepsi bitmeden tekrar etmez, yeni ikili baştan başlar', () => {
  const iv = createInterview(unit, { level: 'A2', students, teams, rng: seeded(9) });
  const seen = [iv.job.word];
  iv.next();
  iv.newPair(); seen.push(iv.job.word); eq(iv.index, 0);
  iv.newPair(); seen.push(iv.job.word);
  eq(new Set(seen).size, 3);
  iv.newPair();
  ok(iv.job.word !== seen[2], 'tur başında art arda aynı meslek yok');
});

test('interview: bilinmeyen seviyede A2 sorularına düşer', () => {
  const iv = createInterview(unit, { level: 'C1', students, teams });
  eq(iv.level, 'A2');
  ok(unit.interview.questions.A2.some(x => x.q === iv.question().q));
});

test('interview: Python seslendirme betiği soruları aynı doldurur (parite)', async () => {
  if (typeof window !== 'undefined') return;
  const { execFileSync } = await import('node:child_process');
  const cases = [['Do you want to be {job}?', 'engineer'], ['Why do you want to be {job}?', 'police officer'], ["What's your name?", 'pilot']];
  const py = `import json,sys,importlib.util\nspec=importlib.util.spec_from_file_location('t','scripts/text_rules.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps([m.fill_job(t,w) for t,w in json.loads(sys.argv[1])]))`;
  eq(JSON.parse(execFileSync('python3', ['-c', py, JSON.stringify(cases)]).toString()), cases.map(([t, w]) => fillJob(t, w)));
});

test('interview: HIRED ekranından geri dönünce son soru atlanmaz (inceleme)', () => {
  const iv = createInterview(unit, { level: 'A2', students, teams, rng: seeded(2) });
  iv.next(); iv.next(); iv.next();
  ok(iv.done);
  ok(iv.prev());
  eq([iv.done, iv.index], [false, 2]);
});

test('interview: yeni turda eski aday mülakatçı olur, yeni aday başka takımdan', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const iv = createInterview(unit, { level: 'A2', students, teams, rng: seeded(seed) });
    const oldCandidate = iv.pair.candidate;
    iv.nextRound();
    eq(iv.pair.interviewer.id, oldCandidate.id, `seed ${seed}`);
    ok(iv.pair.candidate.teamId !== oldCandidate.teamId, `seed ${seed} takım`);
    eq(iv.index, 0);
  }
});

test('interview: bugün aday olmamışlar önce aday olur', () => {
  const iv = createInterview(unit, { level: 'A2', students, teams, candidatesToday: ['s1', 's2', 's3'], rng: seeded(8) });
  eq(iv.pair.candidate.id, 's4');
});

test('interview: iki kişilik sınıfta roller yer değiştirir', () => {
  const two = students.slice(0, 2);
  const iv = createInterview(unit, { level: 'A2', students: two, teams, rng: seeded(1) });
  const { interviewer, candidate } = iv.pair;
  iv.nextRound();
  eq([iv.pair.interviewer.id, iv.pair.candidate.id], [candidate.id, interviewer.id]);
});

import { gapAnswer } from '../app/modules/mock-interview/interview.js';

const jobs = ['engineer', 'pilot', 'coach', 'teacher'];

test('boşluk: meslek boşluğu, A2 baş harf ipucu, cevap metni', () => {
  const g = gapAnswer({ q: 'What job?', a: "I'm [[going to]] be {job}." }, 'teacher', { level: 'A2', index: 0, jobs });
  eq(g.parts.map(p => (typeof p === 'string' ? p : '___')).join(''), "I'm going to be a ___.");
  eq(g.answer, "I'm going to be a teacher.");
  eq(g.hint, 't _ _ _ _ _ _');
});

test('boşluk: sorudan soruya yapı boşluğuna döner', () => {
  const g = gapAnswer({ q: 'What job?', a: "I'm [[going to]] be {job}." }, 'teacher', { level: 'B1', index: 1, jobs });
  eq(g.parts.map(p => (typeof p === 'string' ? p : '___')).join(''), "I'm ___ be a teacher.");
  eq(g.hint, null);
});

test('boşluk: A1 üç seçenekli kelime bankası (doğru + 2 çeldirici)', () => {
  const g = gapAnswer({ q: 'Job?', a: 'I want to be {job}.' }, 'coach', { level: 'A1', index: 0, jobs, rng: seeded(3) });
  eq(g.options.length, 3);
  ok(g.options.includes('coach'));
  eq(new Set(g.options).size, 3);
  const c = gapAnswer({ q: 'Team?', a: 'Yes, I [[can]].', options: ['can', 'am', 'do'] }, 'coach', { level: 'A1', index: 0, jobs, rng: seeded(4) });
  eq([...c.options].sort(), ['am', 'can', 'do']);
});

const pool = Array.from({ length: 12 }, (_, i) => ({ q: `Q${i}?`, a: `Answer [[${i}]].` }));
const bigUnit = { ...unit, interview: { ...unit.interview, perCandidate: 3, questions: { A1: pool, A2: pool, B1: pool } } };

test('mülakat: aday başına 3 soru, 12 soruluk havuz bitene kadar tekrar yok', () => {
  const iv = createInterview(bigUnit, { level: 'A2', students, teams, rng: seeded(6) });
  const seen = [];
  for (let r = 0; r < 4; r++) {
    eq(iv.total, 3);
    for (let i = 0; i < 3; i++) { seen.push(iv.question().q); iv.next(); }
    iv.nextRound();
  }
  eq(new Set(seen).size, 12);
});

test('mülakat: bugün gelen herkes bir kez aday olunca bitti sayılır; kaldığı yerden devam eder', () => {
  const iv = createInterview(bigUnit, { level: 'A2', students, teams, rng: seeded(7) });
  const cands = new Set([iv.pair.candidate.id]);
  while (!iv.allCandidatesDone) { iv.nextRound(); cands.add(iv.pair.candidate.id); }
  eq(cands.size, students.length);
  const again = createInterview(bigUnit, { level: 'A2', students, teams, candidatesToday: ['s1', 's2', 's3'], rng: seeded(8) });
  eq([again.pair.candidate.id, again.allCandidatesDone], ['s4', true]);
  eq(createInterview(bigUnit, { level: 'A2', students, teams, candidatesToday: ['s1', 's2', 's3', 's4'] }).allCandidatesDone, true);
});
