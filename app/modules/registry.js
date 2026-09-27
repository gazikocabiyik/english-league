// Yeni oyun: modules/<oyun>/index.js yaz, buraya import edip diziye ekle.
import coachSays from './coach-says/index.js';
import mockInterview from './mock-interview/index.js';
import warmupDj from './warmup-dj/index.js';

export const games = [coachSays, mockInterview, warmupDj];
