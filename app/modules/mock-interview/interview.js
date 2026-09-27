// Mock Interview mantığı: iki öğrenci (mülakatçı + aday), bir meslek, seviyeye göre sorular.
import { shuffle } from '../coach-says/deck.js';

const article = word => (/^[aeiou]/i.test(word) ? 'an' : 'a');
export const fillJob = (text, word) => text.replaceAll('{job}', `${article(word)} ${word}`);

function pickPair(students, rng) {
  const pool = shuffle(students, rng);
  if (pool.length < 2) return null;
  const interviewer = pool[0];
  const candidate = pool.find(s => s.teamId !== interviewer.teamId) ?? pool[1];
  return { interviewer, candidate };
}

export function createInterview(unit, { level = 'A2', students = [], rng = Math.random } = {}) {
  const iv = unit.interview;
  const questions = iv.questions[level] ?? iv.questions.A2;
  const jobs = iv.jobs.map(w => unit.vocab.find(v => v.word === w)).filter(Boolean);
  let queue = [];
  let last = null;
  const nextJob = () => {
    if (!queue.length) {
      queue = shuffle(jobs, rng);
      if (queue.length > 1 && queue[0] === last) queue.push(queue.shift()); // tur başında art arda aynı meslek olmasın
    }
    last = queue.shift();
    return last;
  };

  let pair = pickPair(students, rng);
  let job = nextJob();
  let i = 0;
  let finished = false;

  return {
    get pair() { return pair; },
    get job() { return job; },
    get index() { return i; },
    get total() { return questions.length; },
    get done() { return finished; },
    get level() { return iv.questions[level] ? level : 'A2'; },
    question() {
      const { q, a } = questions[i];
      return { q: fillJob(q, job.word), a: fillJob(a, job.word) };
    },
    next() {
      if (i < questions.length - 1) { i++; return true; }
      finished = true;
      return false;
    },
    prev() { if (i > 0) { i--; finished = false; return true; } return false; },
    newPair() { pair = pickPair(students, rng); job = nextJob(); i = 0; finished = false; },
  };
}
