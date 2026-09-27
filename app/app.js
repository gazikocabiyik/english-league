import { createStore } from './core/store.js';
import { createRouter } from './core/router.js';
import { h, icon, toast } from './core/dom.js';
import * as sound from './core/sound.js';
import { mountTimerDock } from './modules/timer/timer-dock.js';
import classSelect from './modules/panel/class-select.js';
import panel from './modules/panel/panel.js';
import setup from './modules/panel/setup.js';
import league from './modules/league/league.js';
import { games } from './modules/registry.js';

const store = createStore();
const view = document.getElementById('view');
const banner = document.getElementById('banner');

const ctx = {
  store,
  sound,
  go: hash => router.go(hash),
  rerender: () => router.start(),
  refreshTopbar: () => renderTopbar(),
  get classId() { return store.getSetting('lastClass'); },
  get grade() { return Number(String(store.getSetting('lastClass') ?? '').slice(0, 2)); },
  get unit() { return store.getSetting(`unit:${store.getSetting('lastClass')}`, 1); },
};

// Sonraki görevler bu tabloya satır ekler.
const gameRoute = {
  current: null,
  mount(el, c, [id]) {
    this.current = games.find(g => g.id === id) ?? null;
    if (!this.current) { c.go('#/panel'); return; }
    return this.current.mount(el, c);
  },
  unmount() { this.current?.unmount?.(); },
};

const routes = {
  '': classSelect,
  panel,
  setup,
  league,
  game: gameRoute,
};

let active = null;
const router = createRouter(routes, (screen, args) => {
  active?.unmount?.();
  const host = h('div', { class: 'screen-host' });
  view.replaceChildren(host);
  if (screen !== classSelect && !ctx.classId) { router.go('#/'); return; }
  active = screen;
  screen.mount(host, ctx, args);
  renderTopbar();
});

function renderTopbar() {
  const cls = ctx.classId;
  document.getElementById('topbar').replaceChildren(
    h('button', { class: 'ghost', onclick: () => ctx.go('#/') }, h('span', { class: 'class-badge' }, cls ?? 'English League')),
    cls ? h('button', { class: 'ghost', onclick: () => ctx.go('#/panel') }, `Unit ${ctx.unit}`) : null,
    h('span', { class: 'spacer' }),
    document.getElementById('timer-dock'),
    cls ? h('button', { class: 'ghost', onclick: undo }, icon('arrow-counter-clockwise'), ' Geri al') : null,
    h('button', { class: 'ghost', 'aria-label': 'Tam ekran', onclick: toggleFullscreen }, icon('arrows-out')));
}

function undo() {
  const e = store.undo(ctx.classId);
  toast(e ? `Geri alındı: ${e.reason} ${e.points > 0 ? '+' : ''}${e.points}` : 'Geri alınacak işlem yok');
  document.dispatchEvent(new CustomEvent('scores-changed'));
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

function checkPersistence() {
  banner.hidden = store.persistent;
  banner.textContent = 'Puanlar bu tarayıcıya kaydedilemiyor. Ders sonunda Ayarlar → Yedeği indir.';
}
document.addEventListener('scores-changed', checkPersistence);
checkPersistence();

mountTimerDock(document.getElementById('timer-dock'), ctx);
router.start();
