import { buildMixedDeck, shuffle } from './deck.js';
import { frameFor } from '../../core/content.js';

export const PHASES = ['move', 'speak', 'exit'];

const ORDER = ['A1', 'A2', 'B1', 'B2'];
const rank = L => Math.max(0, ORDER.indexOf(L ?? 'A1'));

// lesson: ünitenin kaçıncı dersi (içerik ders ders değişir); level: sınıfın o dersteki seviyesi.
// words: bu dersin kelimeleri (konuşma turu ile çıkış bileti aynı listeyi kullansın diye saklanır)
export function createSession(unit, { pick = 8, rng = Math.random, review = [], level = 'A2', exitLevel = level, words: fixed = [], lesson } = {}) {
  const inLesson = v => lesson === undefined || v.lesson === undefined || v.lesson === lesson;
  const fits = v => rank(v.level) <= rank(level);
  const chosen = fixed.map(w => unit.vocab.find(v => v.word === w)).filter(Boolean);
  let words = chosen;
  if (!words.length) {
    // Önce dersin kendi kelimeleri, azsa önceki derslerinki (yakın dersten uzağa)
    const own = shuffle(unit.vocab.filter(v => inLesson(v) && fits(v)), rng);
    const earlier = lesson === undefined ? [] : shuffle(unit.vocab.filter(v => v.lesson !== undefined && v.lesson < lesson && fits(v)), rng)
      .sort((x, y) => y.lesson - x.lesson);
    words = [...own, ...earlier].slice(0, pick);
    if (!words.length) words = shuffle(unit.vocab, rng).slice(0, pick);
  }
  const cards = [...words, ...review];
  const atLevel = unit.commands.filter(c => c.level === level && inLesson(c));
  const commands = shuffle(atLevel.length ? atLevel : unit.commands, rng);
  // Çıkış bileti: dersin kendi maddeleri; yoksa dersin kelimeleri
  const exitItems = unit.exits?.[lesson]?.[exitLevel] ?? unit.exits?.[lesson]?.B1 ?? null;
  const levels = { move: level, speak: level, exit: exitLevel };
  const deck = buildMixedDeck(words.length, review.length, rng);
  const lengths = { move: commands.length, speak: deck.length, exit: exitItems ? exitItems.length : words.length };
  let phase = 'move';
  let i = 0;
  const asWord = (w, L) => ({ type: 'word', ...w, frameText: w.frameText ?? frameFor(unit, w.frame, L) });

  return {
    get phase() { return phase; },
    get index() { return i; },
    get total() { return lengths[phase]; },
    get words() { return words; },
    get level() { return levels[phase]; },
    levelOf(p) { return levels[p]; },
    current() {
      if (phase === 'move') return { type: 'command', ...commands[i] };
      if (phase === 'speak') return asWord(cards[deck[i]], level);
      if (!exitItems) return asWord(words[i], exitLevel);
      const x = exitItems[i];
      if (x.word) return asWord(unit.vocab.find(v => v.word === x.word) ?? { word: x.word, frame: 0 }, exitLevel);
      return x.idiom
        ? { type: 'prompt', kind: 'idiom', idiom: x.idiom, prompt: x.q, answer: x.a }
        : { type: 'prompt', kind: 'question', prompt: x.q, answer: x.a };
    },
    next() { if (i < lengths[phase] - 1) { i++; return true; } return false; },
    prev() { if (i > 0) { i--; return true; } return false; },
    setPhase(p) {
      if (!PHASES.includes(p)) throw new Error(`Bilinmeyen tur: ${p}`);
      phase = p;
      i = 0;
    },
  };
}
