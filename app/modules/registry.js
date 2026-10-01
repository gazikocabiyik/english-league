// Yeni oyun: modules/<oyun>/index.js yaz, buraya import edip diziye ekle.
// `hidden: true` olanlar panelde kutu olarak görünmez; ders planının adımıdır (video, kitap, şarkı, Boss).
import coachSays from './coach-says/index.js';
import mockInterview from './mock-interview/index.js';
import warmupDj from './warmup-dj/index.js';
import video from './video/index.js';
import bookTask from './book-task/index.js';
import songBreak from './song-break/index.js';
import bossRound from './boss-round/index.js';
import preSeason from './pre-season/index.js';

export const games = [preSeason, coachSays, mockInterview, warmupDj, video, bookTask, songBreak, bossRound];
