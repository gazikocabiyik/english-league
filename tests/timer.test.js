import { test, eq } from './t.js';
import { createTimer, formatTime } from '../app/modules/timer/timer.js';

test('timer: biçim', () => {
  eq([formatTime(65000), formatTime(0), formatTime(-5), formatTime(29001), formatTime(300000)],
    ['1:05', '0:00', '0:00', '0:30', '5:00']);
});

test('timer: başlat, duraklat, devam, bitiş, sıfırla', () => {
  let t = 0;
  const tm = createTimer(() => t);
  tm.set(30000);
  tm.start(); t = 10000;
  eq(tm.remaining(), 20000);
  tm.pause(); t = 50000;
  eq([tm.remaining(), tm.running], [20000, false]);
  tm.start(); t = 80000;
  eq(tm.remaining(), 0);
  tm.reset();
  eq([tm.remaining(), tm.running], [30000, false]);
});

test('timer: bitmiş sayaç kendiliğinden başlamaz', () => {
  let t = 0;
  const tm = createTimer(() => t);
  tm.set(1000); tm.start(); t = 2000; tm.pause();
  eq([tm.running, tm.remaining()], [false, 0]);
});

test('timer: süre bitince başlat yeniden tam süreden başlar (final M2)', () => {
  let t = 0;
  const tm = createTimer(() => t);
  tm.set(1000); tm.start(); t = 2000; tm.pause();
  tm.start(); t = 2500;
  eq([tm.running, tm.remaining()], [true, 500]);
});
