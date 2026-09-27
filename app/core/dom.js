export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c != null && c !== false) el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function icon(name, label) {
  return h('span', { class: `icon icon-${name}`, role: label ? 'img' : null, 'aria-label': label ?? null, 'aria-hidden': label ? null : 'true' });
}

export function seg(options, current, onPick) {
  return h('div', { class: 'seg', role: 'group' }, options.map(([value, label]) =>
    h('button', { class: value === current ? 'is-on' : '', 'aria-pressed': String(value === current), onclick: () => onPick(value) }, label)));
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

// Dolap kilidi: metal göbek ve içinde pirinç anahtar
export function lockKey() {
  return h('span', { class: 'lock', 'aria-hidden': 'true' }, icon('key'));
}
