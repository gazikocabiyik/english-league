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
  ok(iv.question().q.endsWith(`${job}?`));
  eq(iv.question().a, `I want to be ${/^[aeiou]/.test(job) ? 'an' : 'a'} ${job} because ___.`);
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
  eq(createInterview(unit, { level: 'C1', students, teams }).question().q, 'What job do you want?'.replace('{job}', ''));
});

test('interview: Python seslendirme betiği soruları aynı doldurur (parite)', async () => {
  if (typeof window !== 'undefined') return;
  const { execFileSync } = await import('node:child_process');
  const cases = [['Do you want to be {job}?', 'engineer'], ['Why do you want to be {job}?', 'police officer'], ["What's your name?", 'pilot']];
  const py = `import json,sys,importlib.util\nspec=importlib.util.spec_from_file_location('t','scripts/text_rules.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps([m.fill_job(t,w) for t,w in json.loads(sys.argv[1])]))`;
  eq(JSON.parse(execFileSync('python3', ['-c', py, JSON.stringify(cases)]).toString()), cases.map(([t, w]) => fillJob(t, w)));
});
