// Mock Interview mantığı: iki öğrenci (mülakatçı + aday), bir meslek, seviyeye göre sorular.
import { shuffle } from '../coach-says/deck.js';

const article = word => (/^[aeiou]/i.test(word) ? 'an' : 'a');
export const fillJob = (text, word) => text.replaceAll('{job}', `${article(word)} ${word}`);

// Boşluk doldurma: cevaptaki boşluk adaylarından ({job} = meslek, [[…]] = dil yapısı) biri boş gösterilir.
// A1: 3 seçenekli kelime bankası · A2: baş harf ipucu · B1: ipucu yok.
export function gapAnswer(question, job, { level = 'A2', index = 0, rng = Math.random, jobs = [] } = {}) {
  const tokens = [];
  const re = /\{job\}|\[\[(.+?)\]\]/g;
  let last = 0;
  let m;
  while ((m = re.exec(question.a))) {
    tokens.push(question.a.slice(last, m.index));
    tokens.push(m[0] === '{job}' ? { kind: 'job', text: job, prefix: `${article(job)} ` } : { kind: 'chunk', text: m[1] });
    last = re.lastIndex;
  }
  tokens.push(question.a.slice(last));
  const gaps = tokens.filter(t => typeof t === 'object').sort((x, y) => (x.kind === 'job' ? 0 : 1) - (y.kind === 'job' ? 0 : 1)); // önce meslek
  const gap = gaps.length ? gaps[index % gaps.length] : null;
  const parts = [];
  for (const t of tokens) {
    if (typeof t === 'string') parts.push(t);
    else if (t !== gap) parts.push(t.prefix ? t.prefix + t.text : t.text);
    else { if (t.prefix) parts.push(t.prefix); parts.push({ gap: true }); }
  }
  const answer = tokens.map(t => (typeof t === 'string' ? t : (t.prefix ?? '') + t.text)).join('');
  if (!gap) return { parts, answer, hint: null, options: null };
  // A2 ipucu kelime kelime: "going to" → "g _ _ _ _ / t _"
  const hint = level === 'A2' ? gap.text.split(' ').map(w => [...w].map((ch, k) => (k === 0 ? ch : '_')).join(' ')).join(' / ') : null;
  let options = null;
  if (level === 'A1') {
    const pool = gap.kind === 'job' ? jobs.filter(j => j !== gap.text) : (question.options ?? []).filter(o => o !== gap.text);
    options = shuffle([gap.text, ...shuffle(pool, rng).slice(0, 2)], rng);
  }
  return { parts, answer, hint, options };
}


export function createInterview(unit, { level = 'A2', lesson, students = [], candidatesToday = [], rng = Math.random } = {}) {
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
  // Derse özel soru seti (ör. 3. ders kitabın mülakat soruları), yoksa seviyenin genel soruları
  const pool = iv.byLesson?.[lesson]?.[level] ?? iv.questions[level] ?? iv.questions.A2;
  const perCandidate = Math.min(iv.perCandidate ?? 3, pool.length);
  // Soru havuzu: bitene kadar tekrar etmez, sonra karışık baştan
  let qQueue = [];
  const takeQuestions = () => {
    const out = [];
    while (out.length < perCandidate && pool.length) {
      if (!qQueue.length) qQueue = shuffle(pool, rng).filter(x => !out.includes(x));
      out.push(qQueue.shift());
    }
    return out;
  };
  let questions = pool.length ? takeQuestions() : [];
  // Mülakatı gerçekten biten adaylar (bugün cevap kaydı olanlar dahil); seçilmek "bitti" saymaz
  const completed = new Set(candidatesToday.filter(id => students.some(s => s.id === id)));
  let asked = 0; // boşluk türünü sorudan soruya değiştirmek için sayaç
  const jobWords = iv.jobs;
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
    // Bugün gelen herkes en az bir kez aday oldu mu
    get allCandidatesDone() { return students.length > 0 && students.every(s => completed.has(s.id)); },
    get done() { return finished; },
    get level() { return iv.byLesson?.[lesson]?.[level] || iv.questions[level] ? level : 'A2'; },
    question() {
      const item = questions[i];
      if (!item) return null;
      const gap = gapAnswer(item, job.word, { level: this.level, index: asked + i, rng, jobs: jobWords });
      return { q: fillJob(item.q, job.word), a: gap.answer, gap };
    },
    next() {
      if (i < questions.length - 1) { i++; return true; }
      finished = true;
      if (pair) completed.add(pair.candidate.id);
      return false;
    },
    prev() {
      if (finished) { finished = false; return true; } // HIRED ekranından son soruya dön
      if (i > 0) { i--; return true; }
      return false;
    },
    // Tamamen yeni ikili ("İkiliyi değiştir")
    newPair() { pair = pickPair(); job = nextJob(); asked += i + 1; questions = pool.length ? takeQuestions() : []; i = 0; finished = false; },
    // Sıradaki tur: aday mülakatçı olur, yeni aday başka takımdan
    nextRound() {
      if (!pair) return this.newPair();
      const interviewer = pair.candidate;
      pair = pairFrom(interviewer, chooseCandidate(interviewer));
      job = nextJob(); asked += i + 1; questions = pool.length ? takeQuestions() : []; i = 0; finished = false;
    },
  };
}
