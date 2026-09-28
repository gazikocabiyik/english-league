// Ortak veri (Faz 5a): "önce yerel, sonra bulut".
// Tahta her değişikliği önce kendi deposuna yazar; kayıt bir gönderim kuyruğuna düşer ve internet olunca buluta gider.
// Diğer tahtaların kayıtları "son çekimden beri güncellenenler" olarak çekilip yerel depoya birleştirilir.
export { isSharedSetting } from './store.js';

const OUTBOX = 'okul.v1.outbox';
const CURSOR = 'okul.v1.cursor';

// cloud: { upsert(records), pullSince(cursor) → [{...record, updated_at}], subscribe?(onChange) → unsubscribe }
export function createSync({ store, cloud, storage = globalThis.localStorage, now = () => Date.now() }) {
  const read = (k, fb) => { try { const v = storage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
  const write = (k, v) => { try { storage.setItem(k, JSON.stringify(v)); } catch { /* yer yok: bellekte kalır */ } };

  let outbox = read(OUTBOX, {});   // kimlik → kayıt (aynı kaydın son hâli)
  let cursor = read(CURSOR, 0);
  let status = 'idle';             // idle | ok | offline
  let lastSync = null;
  let flushTimer = null;
  let flushing = null;
  const statusListeners = [];
  const setStatus = s => { status = s; for (const fn of statusListeners) fn(api); };

  store.onChange(rec => {
    outbox[rec.id] = rec;
    write(OUTBOX, outbox);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => api.flush(), 2000); // kısa sürede gelen değişiklikler toplu gider
    setStatus(status);
  });

  const api = {
    get pending() { return Object.keys(outbox).length; },
    get status() { return status; },
    get lastSync() { return lastSync; },
    onStatus(fn) { statusListeners.push(fn); },
    resetCursor() { cursor = 0; write(CURSOR, 0); },
    // İlk girişte bu tahtadaki mevcut veriyi bir kez kuyruğa koy (buluttan önce biriken pilot verisi kaybolmasın)
    seed() {
      if (read('okul.v1.seeded', false)) return false;
      for (const r of store.snapshotRecords()) outbox[r.id] = r;
      write(OUTBOX, outbox);
      write('okul.v1.seeded', true);
      return true;
    },

    async flush() {
      if (flushing) return flushing; // aynı anda iki gönderim olmasın
      flushing = (async () => {
        const batch = Object.values(outbox);
        if (!batch.length) return;
        try {
          for (let i = 0; i < batch.length; i += 500) await cloud.upsert(batch.slice(i, i + 500));
          for (const r of batch) if (outbox[r.id] === r) delete outbox[r.id]; // gönderim sırasında değişen kayıt kuyrukta kalır
          write(OUTBOX, outbox);
          lastSync = now();
          setStatus('ok');
        } catch {
          setStatus('offline');
        }
      })();
      try { await flushing; } finally { flushing = null; }
    },

    async pull() {
      try {
        let changed = 0;
        for (let round = 0; round < 50; round++) { // sayfalı çekim
          const rows = await cloud.pullSince(cursor);
          if (!rows.length) break;
          changed += store.applyRemote(rows);
          cursor = rows[rows.length - 1].updated_at;
          write(CURSOR, cursor);
          if (rows.length < 1000) break;
        }
        lastSync = now();
        setStatus('ok');
        return changed;
      } catch {
        setStatus('offline');
        return 0;
      }
    },

    // Açılışta: önce bekleyenleri gönder, sonra çek; ardından 30 sn'de bir gönder, 60 sn'de bir çek, anlık bildirimle çek
    start({ onRemote } = {}) {
      const pullAndNotify = async () => { if (await api.pull()) onRemote?.(); };
      (async () => { await api.flush(); await pullAndNotify(); })();
      setInterval(() => api.flush(), 30000);
      setInterval(pullAndNotify, 60000);
      cloud.subscribe?.(() => pullAndNotify());
      globalThis.addEventListener?.('online', () => { api.flush(); pullAndNotify(); });
    },
  };
  return api;
}
