import { test, eq, ok } from './t.js';
import { speechKey, audioFor } from '../app/core/speech-map.js';

test('ses: metin anahtarı büyük/küçük harf ve boşluktan bağımsız', () => {
  eq(speechKey('  Coach says:  JUMP! '), 'coach says: jump!');
  eq(speechKey("I'm going to be a/an firefighter."), "i'm going to be a/an firefighter.");
});

test('ses: manifestte olan metin dosyasını, olmayan null döndürür', () => {
  const m = { 'coach says: jump!': 'audio/11/ab12.mp3' };
  eq(audioFor(m, 'Coach says: JUMP!'), 'content/audio/11/ab12.mp3');
  eq(audioFor(m, 'Sit down!'), null);
  eq(audioFor(null, 'Sit down!'), null);
});

import { fillFrame } from '../app/core/speech-map.js';
import { buildMixedDeck } from '../app/modules/coach-says/deck.js';
import { seeded } from './coach.test.js';

test('ses: a/an kelimeye göre çözülür, sondaki "…" okunmaz (inceleme I2)', () => {
  eq(fillFrame("I'm going to be a/an ___.", 'engineer'), "I'm going to be an engineer.");
  eq(fillFrame("I'm going to be a/an ___.", 'pilot'), "I'm going to be a pilot.");
  eq(fillFrame('My favourite ___ is …', 'song'), 'My favourite song.');
  eq(fillFrame('I prefer ___ music.', 'rock'), 'I prefer rock music.');
});

test('ses: Python seslendirme betiği aynı cümleleri üretir (parite)', async () => {
  if (typeof window !== 'undefined') return;
  const { execFileSync } = await import('node:child_process');
  const cases = [["I'm going to be a/an ___.", 'engineer'], ["I'm going to be a/an ___.", 'police officer'], ['My favourite ___ is …', 'song'], ['A good friend is ___.', 'honest']];
  const py = `import json,sys,importlib.util\nspec=importlib.util.spec_from_file_location('t','scripts/text_rules.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps([m.fill_frame(f,w) for f,w in json.loads(sys.argv[1])]))`;
  const out = JSON.parse(execFileSync('python3', ['-c', py, JSON.stringify(cases)]).toString());
  eq(out, cases.map(([f, w]) => fillFrame(f, w)));
});

test('deck: ders hiçbir zaman tekrar kartıyla başlamaz (inceleme)', () => {
  for (let seed = 1; seed <= 30; seed++) ok(buildMixedDeck(8, 3, seeded(seed))[0] < 8);
});
