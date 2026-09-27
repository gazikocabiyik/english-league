// Warm-up DJ (12/Ü1 Music) — kazanım: görüş bildirme, katılma/katılmama, tercih belirtme.
// Her turda bir spor durumu: seçen öğrenci bir tür seçip savunur, başka takımdan biri katılır/katılmaz.
import { shuffle } from '../coach-says/deck.js';
import { createPicker } from '../coach-says/picker.js';

export function createDJ(unit, { level = 'A2', students = [], pickedToday = [], rng = Math.random } = {}) {
  const dj = unit.dj;
  const lv = dj.lines[level] ? level : 'A2';
  const situations = shuffle(dj.situations, rng);
  const picker = createPicker(students, { excludeIds: pickedToday, rng });
  const history = [];
  let round = 0;
  let step = 'choose';
  let genre = null;
  let chooser = null;
  let responder = null;

  function pickResponder() {
    if (students.length < 2) return null;
    let r = picker.pick();
    for (let i = 0; i < students.length && (r.id === chooser.id || (r.teamId === chooser.teamId && students.some(s => s.teamId !== chooser.teamId))); i++) r = picker.skip();
    return r.id === chooser.id ? null : r;
  }
  function newPeople() { chooser = picker.pick(); responder = chooser ? pickResponder() : null; }
  newPeople();

  return {
    get round() { return round; },
    get total() { return situations.length; },
    get step() { return step; },
    get done() { return round >= situations.length; },
    get level() { return lv; },
    get situation() { return situations[Math.min(round, situations.length - 1)]; },
    get genre() { return genre; },
    get chooser() { return chooser; },
    get responder() { return responder; },
    get current() { return step === 'choose' ? chooser : responder; },
    get history() { return history; },
    get playlist() { return history.map(x => ({ situation: x.situation.text, genre: x.genre, by: x.chooser.name })); },
    genres() { return dj.genres.map(w => unit.vocab.find(v => v.word === w)).filter(Boolean); },
    line() {
      const l = dj.lines[lv];
      return step === 'choose' ? (genre ? l.choose.replace('___', genre) : l.choose) : l.reply;
    },
    setGenre(g) { if (step === 'choose') genre = g; },
    // Konuşan öğrenci işaretlenince akış ilerler; tür seçilmeden seçen işaretlenemez
    mark() {
      if (this.done || (step === 'choose' && !genre)) return false;
      if (step === 'choose' && responder) { step = 'reply'; return true; }
      history.push({ situation: situations[round], genre, chooser, responder });
      round++; step = 'choose'; genre = null;
      if (!this.done) newPeople();
      return true;
    },
    // Öğrenci yoksa/hazır değilse: işaretsiz başka öğrenci
    skipPerson() {
      if (step === 'choose') { chooser = picker.skip(); responder = pickResponder(); }
      else responder = pickResponder() ?? responder;
    },
  };
}
