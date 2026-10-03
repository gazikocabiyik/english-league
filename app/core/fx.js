// Oyun anları (GSAP): puan "+1" yükselişi, cevap damgası, sayı sayma, lig sıra değişimi, konfeti.
// GSAP yerel dosyadan yüklenir (vendor/gsap.min.js); yoksa ya da "hareketi azalt" açıksa hiçbiri çalışmaz, ekran yine doğrudur.
const reduce = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const G = () => (globalThis.gsap && !reduce() ? globalThis.gsap : null);
const TEAM = ['--team-1', '--team-2', '--team-3', '--team-4', '--accent'];

// Bir öğenin üstünden "+1" yükselir (puan verilen düğme)
export function floatPoints(anchor, text) {
  const gsap = G();
  if (!gsap || !anchor?.isConnected) return;
  const r = anchor.getBoundingClientRect();
  const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1; // sayfa ölçeği
  const tag = document.createElement('div');
  tag.className = 'fx-points';
  tag.textContent = text;
  Object.assign(tag.style, { left: `${(r.left + r.width / 2) / z}px`, top: `${(r.top + r.height / 2) / z}px` });
  document.body.append(tag);
  gsap.timeline({ onComplete: () => tag.remove() })
    .fromTo(tag, { xPercent: -50, yPercent: -50, scale: 0.4, autoAlpha: 0 }, { scale: 1.25, autoAlpha: 1, duration: 0.25, ease: 'back.out(2.5)' })
    .to(tag, { y: -110, scale: 1, duration: 0.7, ease: 'power2.out' }, '<0.1')
    .to(tag, { autoAlpha: 0, duration: 0.3 }, '-=0.25');
  gsap.fromTo(anchor, { scale: 1 }, { scale: 1.06, duration: 0.12, yoyo: true, repeat: 1, ease: 'power1.inOut', clearProps: 'transform' });
}

// Cevap damgası çarparak gelir; doğru bilen takımların "+1"leri sırayla belirir
export function slam(stamp, pops = []) {
  const gsap = G();
  if (!gsap) return;
  if (stamp) gsap.fromTo(stamp, { scale: 2.6, rotation: -16, autoAlpha: 0 }, { scale: 1, rotation: -4, autoAlpha: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'scale,rotation,opacity,visibility' });
  if (pops.length) gsap.from(pops, { scale: 0, autoAlpha: 0, duration: 0.35, ease: 'back.out(3)', stagger: 0.12, delay: 0.25 });
}

// Sayı 0'dan hedefe sayar (ör. "Başlangıç: %60", Boss doğru oranı)
export function countUp(el, to, { prefix = '', suffix = '', duration = 1.1 } = {}) {
  const gsap = G();
  if (!gsap || !el) return;
  const o = { v: 0 };
  gsap.to(o, { v: to, duration, ease: 'power2.out', onUpdate: () => { el.textContent = `${prefix}${Math.round(o.v)}${suffix}`; } });
}

// Ekrana giren öğeler sırayla (lig satırları, kartlar)
export function enter(els, { x = 0, y = 24, stagger = 0.06 } = {}) {
  const gsap = G();
  if (!gsap || !els?.length) return;
  gsap.from(els, { x, y, autoAlpha: 0, duration: 0.45, ease: 'power3.out', stagger, clearProps: 'transform,opacity,visibility' });
}

// Lig: satır eski yerinden yenisine kayar; yükselen satır kısa bir parlama alır
export function slide(el, dy) {
  const gsap = G();
  if (!gsap || !dy) return;
  gsap.fromTo(el, { y: dy }, { y: 0, duration: 0.6, ease: 'back.out(1.2)', clearProps: 'transform' });
  if (dy > 0) gsap.fromTo(el, { boxShadow: '0 0 0 0 rgb(255 210 31 / .9)' }, { boxShadow: '0 0 0 14px rgb(255 210 31 / 0)', duration: 0.9, ease: 'power2.out', clearProps: 'boxShadow' });
}

// Konfeti: ekranın ortasından patlar, yer çekimiyle düşer (Boss zaferi)
export function confetti({ count = 90 } = {}) {
  const gsap = G();
  if (!gsap) return;
  const layer = document.createElement('div');
  layer.className = 'fx-confetti';
  document.body.append(layer);
  const W = innerWidth, H = innerHeight;
  const css = getComputedStyle(document.documentElement);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.background = css.getPropertyValue(TEAM[i % TEAM.length]).trim() || '#ffd21f';
    layer.append(p);
    const angle = gsap.utils.random(-Math.PI * 0.95, -Math.PI * 0.05);
    const power = gsap.utils.random(0.35, 0.75) * H;
    gsap.set(p, { x: W / 2, y: H * 0.55, rotation: gsap.utils.random(0, 360), scaleY: gsap.utils.random(0.5, 1.4) });
    gsap.timeline()
      .to(p, { x: `+=${Math.cos(angle) * power}`, y: `+=${Math.sin(angle) * power}`, rotation: '+=360', duration: 0.7, ease: 'power3.out' })
      .to(p, { y: H + 40, x: `+=${gsap.utils.random(-120, 120)}`, rotation: '+=540', duration: gsap.utils.random(1.4, 2.4), ease: 'power1.in' });
  }
  setTimeout(() => layer.remove(), 3600);
}
