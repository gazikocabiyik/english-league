export function formatTime(ms) {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createTimer(now = () => performance.now()) {
  let duration = 0;
  let startedAt = null;
  let elapsedBefore = 0;
  const timer = {
    set(ms) { duration = ms; startedAt = null; elapsedBefore = 0; },
    start() { if (startedAt === null && timer.remaining() > 0) startedAt = now(); },
    pause() {
      if (startedAt !== null) { elapsedBefore += now() - startedAt; startedAt = null; }
    },
    reset() { timer.set(duration); },
    remaining() {
      const running = startedAt === null ? 0 : now() - startedAt;
      return Math.max(0, duration - elapsedBefore - running);
    },
    get running() { return startedAt !== null; },
    get duration() { return duration; },
  };
  return timer;
}
