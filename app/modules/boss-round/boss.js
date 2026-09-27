// Boss Round: ünitenin kelime, kalıp ve görev sorularından 10 hızlı kart (seviye L ve L+1 karışık).
import { shuffle } from '../coach-says/deck.js';
import { frameFor } from '../../core/content.js';
import { fillFrame } from '../../core/speech-map.js';

const article = w => (/^[aeiou]/i.test(w) ? 'an' : 'a');
const strip = a => a.replace(/\[\[(.+?)\]\]/g, '$1');

export function buildBoss(unit, { levels = ['A2'], size = 10, rng = Math.random } = {}) {
  const lv = i => levels[i % levels.length];
  const words = shuffle(unit.vocab ?? [], rng);
  const photo = words.map((v, i) => ({ type: 'photo', prompt: 'What is this?', img: v.img, answer: v.word, level: lv(i) }));
  const frame = words.map((v, i) => {
    const L = lv(i + 1);
    const t = frameFor(unit, v.frame, L) ?? '';
    return { type: 'frame', prompt: t.replace('a/an ___', `${article(v.word)} ___`), img: v.img, answer: fillFrame(t, v.word), level: L };
  }).filter(c => c.prompt.includes('___'));
  const qs = [];
  levels.forEach(L => {
    for (const x of unit.interview?.questions?.[L] ?? []) qs.push({ type: 'question', prompt: x.q.replace('{job}', 'a coach'), answer: strip(x.a).replace('{job}', 'a coach'), level: L });
    if (unit.dj) for (const s of unit.dj.situations) qs.push({ type: 'question', prompt: `${s.text}: which music?`, answer: unit.dj.lines[L]?.choose.replace('___', 'rock') ?? '', level: L });
  });
  const pools = [shuffle(photo, rng), shuffle(frame, rng), shuffle(qs, rng)];
  const want = [4, 4, 2];
  const out = [];
  pools.forEach((p, i) => out.push(...p.slice(0, want[i])));
  // eksik türleri diğer havuzlardan tamamla
  for (const p of pools) for (const c of p) if (out.length < size && !out.includes(c)) out.push(c);
  const deck = shuffle(out.slice(0, size), rng);
  // aynı cevap art arda gelmesin
  for (let i = 1; i < deck.length; i++) if (deck[i].answer === deck[i - 1].answer) deck.push(deck.splice(i, 1)[0]);
  return deck;
}
