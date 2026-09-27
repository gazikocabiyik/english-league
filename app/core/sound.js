import { audioFor } from './speech-map.js';

let ac;

export function whistle() {
  ac ??= new AudioContext();
  if (ac.state === 'suspended') ac.resume();
  const t = ac.currentTime;
  const osc = ac.createOscillator(), lfo = ac.createOscillator(), lfoGain = ac.createGain(), gain = ac.createGain();
  osc.frequency.value = 2900;
  lfo.frequency.value = 28;
  lfoGain.gain.value = 180;
  lfo.connect(lfoGain).connect(osc.frequency);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
  gain.gain.setValueAtTime(0.35, t + 0.9);
  gain.gain.linearRampToValueAtTime(0, t + 1);
  osc.connect(gain).connect(ac.destination);
  osc.start(t); lfo.start(t);
  osc.stop(t + 1.05); lfo.stop(t + 1.05);
}

function speakSynth(text, { rate = 0.85 } = {}) {
  if (!('speechSynthesis' in window)) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  const voice = speechSynthesis.getVoices().find(v => v.lang === 'en-US');
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
  return true;
}

// Doğal sesler: manifest'te varsa MP3 çal, yoksa ya da çalamazsa tarayıcı sesine düş.
let manifest = null;
fetch('content/audio/manifest.json').then(r => (r.ok ? r.json() : null)).then(m => { manifest = m; }).catch(() => {});
let current = null;

export function speak(text, opts) {
  current?.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  const url = audioFor(manifest, text);
  if (!url) return speakSynth(text, opts);
  current = new Audio(url);
  current.play().catch(() => speakSynth(text, opts));
  return true;
}

export function stopSpeaking() {
  current?.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
