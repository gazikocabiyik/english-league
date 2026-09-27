import { test, eq } from './t.js';
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
