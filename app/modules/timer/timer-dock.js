import { h, icon } from '../../core/dom.js';
import { createTimer, formatTime } from './timer.js';

const PRESETS = [[30e3, '30 sn'], [60e3, '1 dk'], [180e3, '3 dk'], [300e3, '5 dk']];

export function mountTimerDock(el, ctx) {
  const timer = createTimer();
  timer.set(60e3);
  let open = false;
  const digits = h('span', { class: 'timer-digits' });
  const big = h('span', { class: 'timer-big stencil' });
  const playBtn = h('button', { class: 'timer-play', onclick: () => { timer.running ? timer.pause() : timer.start(); paint(); } });

  function paint() {
    digits.textContent = big.textContent = formatTime(timer.remaining());
    playBtn.replaceChildren(icon(timer.running ? 'pause' : 'play', timer.running ? 'Duraklat' : 'Başlat'));
    el.classList.toggle('is-open', open);
    el.classList.toggle('is-running', timer.running);
  }

  el.append(
    h('button', { class: 'timer-toggle', 'aria-label': 'Zamanlayıcı', onclick: () => { open = !open; paint(); } }, icon('timer'), digits),
    h('div', { class: 'timer-panel' },
      big,
      h('div', { class: 'timer-presets' }, PRESETS.map(([ms, label]) =>
        h('button', { onclick: () => { timer.set(ms); paint(); } }, label))),
      h('div', { class: 'timer-controls' },
        playBtn,
        h('button', { 'aria-label': 'Sıfırla', onclick: () => { timer.reset(); paint(); } }, icon('arrow-counter-clockwise')))));

  setInterval(() => {
    if (timer.running && timer.remaining() === 0) {
      timer.pause();
      ctx.sound.whistle();
      document.body.classList.add('time-up');
      setTimeout(() => document.body.classList.remove('time-up'), 3000);
    }
    paint();
  }, 200);
  paint();
}
