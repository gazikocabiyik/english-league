import { buildMixedDeck, shuffle } from './deck.js';
import { frameFor } from '../../core/content.js';

export const PHASES = ['move', 'speak', 'exit'];

// words: günün kelimeleri (aynı gün konuşma turu ve çıkış bileti aynı kelimeleri kullansın)
export function createSession(unit, { pick = 8, rng = Math.random, review = [], level = 'A2', exitLevel = level, words: fixed = [] } = {}) {
  const chosen = fixed.map(w => unit.vocab.find(v => v.word === w)).filter(Boolean);
  const words = chosen.length ? chosen : shuffle(unit.vocab, rng).slice(0, pick);
  const cards = [...words, ...review];
  const atLevel = unit.commands.filter(c => c.level === level);
  const commands = shuffle(atLevel.length ? atLevel : unit.commands, rng);
  const levels = { move: level, speak: level, exit: exitLevel };
  const deck = buildMixedDeck(words.length, review.length, rng);
  const lengths = { move: commands.length, speak: deck.length, exit: words.length };
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
      return asWord(words[i], exitLevel);
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
