export function createRouter(routes, onRoute) {
  function resolve() {
    const [, name = '', ...args] = (location.hash || '#/').split('/');
    onRoute(routes[name] ?? routes[''], args.map(decodeURIComponent));
  }
  window.addEventListener('hashchange', resolve);
  return {
    start: resolve,
    go(hash) { if (location.hash === hash) resolve(); else location.hash = hash; },
  };
}
