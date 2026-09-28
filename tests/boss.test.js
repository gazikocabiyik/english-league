import { test, eq, ok } from './t.js';
import { buildBoss } from '../app/modules/boss-round/boss.js';
import { videoQuestions } from '../app/modules/video/video.js';
import { seeded } from './coach.test.js';

const unit = {
  frames: { A1: ['It is a/an ___.'], A2: ["I'm going to be a/an ___."], B1: ['When I finish school, I will be a/an ___.'] },
  vocab: ['coach', 'pilot', 'vet', 'engineer', 'teacher', 'soldier'].map(w => ({ word: w, tr: w, img: `media/11/${w}.jpg`, frame: 0 })),
  interview: { jobs: ['coach'], questions: { A1: [{ q: 'Are you strong?', a: 'Yes, I [[am]].' }], A2: [{ q: 'Can you work in a team?', a: 'Yes, I [[can]].' }], B1: [{ q: 'Why?', a: 'Because ___.' }] } },
};

test('boss: 10 kart; foto, kalıp ve soru türleri karışık; seviyeler L ve L+1', () => {
  const cards = buildBoss(unit, { levels: ['A1', 'A2'], rng: seeded(3) });
  eq(cards.length, 10);
  ok(['photo', 'frame', 'question'].every(t => cards.some(c => c.type === t)), 'üç tür de var');
  ok(cards.every(c => ['A1', 'A2'].includes(c.level)));
  const f = cards.find(c => c.type === 'frame');
  ok(f.prompt.includes('___') && !f.prompt.includes('a/an'), 'kalıpta a/an çözülür, boşluk kalır');
  for (let i = 1; i < cards.length; i++) ok(!(cards[i].type === 'photo' && cards[i - 1].type === 'photo' && cards[i].answer === cards[i - 1].answer));
});

test('boss: kelime azsa kart sayısı düşer ama çökmez', () => {
  const tiny = { ...unit, vocab: unit.vocab.slice(0, 2), interview: undefined };
  const cards = buildBoss(tiny, { levels: ['A2'], rng: seeded(1) });
  ok(cards.length > 0 && cards.length <= 10);
});

test('video: seviyeye göre sorular, yoksa A2', () => {
  const v = { questions: { A1: [{ q: '1', a: 'a' }], A2: [{ q: '2', a: 'b' }] } };
  eq(videoQuestions(v, 'A1')[0].q, '1');
  eq(videoQuestions(v, 'B1')[0].q, '2');
  eq(videoQuestions({}, 'A1'), []);
});

test('boss: soyut kelimede foto yerine tanım sorusu; seviye üstü kelime gelmez', () => {
  const u = {
    frames: { A1: ['It is ___.'], A2: ['It is ___.'], B1: ['It is ___.'] },
    vocab: [
      { word: 'achieve', def: 'to succeed in reaching an aim', frame: 0, level: 'A2' },
      { word: 'surgeon', img: 'm/s.jpg', frame: 0, level: 'A1' },
      { word: 'entrepreneur', def: 'a person who starts a business', frame: 0, level: 'B2' },
    ],
  };
  const deck = buildBoss(u, { levels: ['A2'], rng: seeded(3) });
  ok(!deck.some(c => c.answer.includes('entrepreneur')), 'B2 kelime A2 sınıfa gelmez');
  ok(!deck.some(c => c.type === 'photo' && !c.img), 'fotosuz foto kartı yok');
  ok(deck.some(c => c.type === 'def' && c.prompt.includes('to succeed in reaching an aim') && c.answer === 'achieve'));
});
