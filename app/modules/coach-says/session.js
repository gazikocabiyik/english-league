import { buildMixedDeck, shuffle } from './deck.js';

export const PHASES = ['move', 'speak', 'exit'];

export function createSession(unit, { pick = 8, rng = Math.random, review = [] } = {}) {
  const words = shuffle(unit.vocab, rng).slice(0, pick);
  const cards = [...words, ...review];
  const commands = shuffle(unit.commands, rng);
  const deck = buildMixedDeck(words.length, review.length, rng);
  const lengths = { move: commands.length, speak: deck.length, exit: words.length };
  let phase = 'move';
  let i = 0;
  const asWord = w => ({ type: 'word', ...w, frameText: w.frameText ?? unit.frames[w.frame] });

  return {
    get phase() { return phase; },
    get index() { return i; },
    get total() { return lengths[phase]; },
    get words() { return words; },
    current() {
      if (phase === 'move') return { type: 'command', ...commands[i] };
      if (phase === 'speak') return asWord(cards[deck[i]]);
      return asWord(words[i]);
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
