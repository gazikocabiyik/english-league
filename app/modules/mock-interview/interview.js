// Mock Interview mantığı: iki öğrenci (mülakatçı + aday), bir meslek, seviyeye göre sorular.
import { shuffle } from '../coach-says/deck.js';

const article = word => (/^[aeiou]/i.test(word) ? 'an' : 'a');
export const fillJob = (text, word) => text.replaceAll('{job}', `${article(word)} ${word}`);


export function createInterview(unit, { level = 'A2', students = [], candidatesToday = [], rng = Math.random } = {}) {
  // Adaylık sayısı: bugün aday olmamışlar önce aday olur
  const asCandidate = new Map(students.map(s => [s.id, 0]));
  for (const id of candidatesToday) if (asCandidate.has(id)) asCandidate.set(id, asCandidate.get(id) + 1);
  const leastUsed = pool => {
    const min = Math.min(...pool.map(s => asCandidate.get(s.id)));
    return shuffle(pool.filter(s => asCandidate.get(s.id) === min), rng)[0];
  };
  const chooseCandidate = interviewer => {
    const others = students.filter(s => s.id !== interviewer?.id);
    const otherTeam = others.filter(s => !interviewer || s.teamId !== interviewer.teamId);
    return leastUsed(otherTeam.length ? otherTeam : others);
  };
  const pairFrom = (interviewer, candidate) => {
    asCandidate.set(candidate.id, asCandidate.get(candidate.id) + 1);
    return { interviewer, candidate };
  };
  function pickPair() {
    if (students.length < 2) return null;
    const candidate = leastUsed(students);
    const others = students.filter(s => s.id !== candidate.id);
    const otherTeam = others.filter(s => s.teamId !== candidate.teamId);
    return pairFrom(shuffle(otherTeam.length ? otherTeam : others, rng)[0], candidate);
  }

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

  let pair = pickPair();
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
    prev() {
      if (finished) { finished = false; return true; } // HIRED ekranından son soruya dön
      if (i > 0) { i--; return true; }
      return false;
    },
    // Tamamen yeni ikili ("İkiliyi değiştir")
    newPair() { pair = pickPair(); job = nextJob(); i = 0; finished = false; },
    // Sıradaki tur: aday mülakatçı olur, yeni aday başka takımdan
    nextRound() {
      if (!pair) return this.newPair();
      const interviewer = pair.candidate;
      pair = pairFrom(interviewer, chooseCandidate(interviewer));
      job = nextJob(); i = 0; finished = false;
    },
  };
}
