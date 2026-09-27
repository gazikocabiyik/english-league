import { nextLevel, dayKey, LEVELS } from './levels.js';

const KEY = 'okul.v1';

export function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

export function weekStart(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const emptyState = () => ({ version: 1, classes: {}, events: [], attempts: [], settings: {} });

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

function isValidState(s) {
  return isObj(s) && s.version === 1 && isObj(s.classes)
    && Object.values(s.classes).every(c => isObj(c) && Array.isArray(c.teams) && Array.isArray(c.students))
    && (s.settings === undefined || (isObj(s.settings) && (s.settings.classList === undefined || Array.isArray(s.settings.classList))))
    && (s.attempts === undefined || (Array.isArray(s.attempts) && s.attempts.every(a => isObj(a) && typeof a.classId === 'string' && typeof a.ok === 'boolean')))
    && Array.isArray(s.events)
    && s.events.every(e => e && typeof e.classId === 'string' && typeof e.targetId === 'string'
      && (e.targetType === 'team' || e.targetType === 'student')
      && Number.isFinite(e.points) && Number.isFinite(e.ts));
}

function canWrite(storage) {
  try { storage.setItem('okul.probe', '1'); return true; } catch { return false; }
}

export function createStore(storage, now = () => Date.now()) {
  // Site verisi engelliyse localStorage'a erişmek bile hata fırlatır.
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  let persistent = !!storage && canWrite(storage);
  const backend = persistent ? storage : memoryStorage();
  let state = emptyState();
  try {
    const saved = JSON.parse(backend.getItem(KEY));
    if (isValidState(saved)) state = { ...emptyState(), ...saved };
  } catch { /* bozuk kayıt: boş başla */ }

  function save() {
    if (!persistent) return;
    try { backend.setItem(KEY, JSON.stringify(state)); } catch { persistent = false; }
  }
  const uid = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function getClass(classId) {
    return state.classes[classId] ?? { teams: [], students: [] };
  }

  function standings(classId, { type = 'team', since = 0 } = {}) {
    const cls = getClass(classId);
    const roster = type === 'team' ? cls.teams : cls.students;
    const pts = new Map(roster.map(r => [r.id, 0]));
    for (const e of state.events) {
      if (e.classId === classId && e.targetType === type && e.ts >= since && pts.has(e.targetId)) {
        pts.set(e.targetId, pts.get(e.targetId) + e.points);
      }
    }
    return roster.map(r => ({ ...r, points: pts.get(r.id) }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr'));
  }

  return {
    get persistent() { return persistent; },
    getClass,
    saveClass(classId, { teams, students }) { state.classes[classId] = { teams, students }; save(); },
    addEvent({ classId, targetType, targetId, points, reason = '', groupId }) {
      const e = { id: uid(), classId, targetType, targetId, points, reason, ts: now(), ...(groupId ? { groupId } : {}) };
      state.events.push(e);
      save();
      return e;
    },
    undo(classId) {
      for (let i = state.events.length - 1; i >= 0; i--) {
        if (state.events[i].classId === classId) {
          const [e] = state.events.splice(i, 1);
          // Aynı gruptaki olaylar (ör. Mock Interview: öğrenci + takım puanı) birlikte geri alınır
          const removed = new Set([e.id]);
          if (e.groupId) {
            state.events = state.events.filter(x => {
              if (x.classId === classId && x.groupId === e.groupId) { removed.add(x.id); return false; }
              return true;
            });
          }
          state.attempts = state.attempts.filter(a => !removed.has(a.eventId));
          save();
          return e;
        }
      }
      return null;
    },
    standings,
    // Okul ligi (adil karşılaştırma): şubeler ve öğrenciler başarı oranıyla (doğru ÷ cevap, %), takımlar puanla
    schoolStandings({ type = 'class', grade = null, since = 0 } = {}) {
      const byName = (a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr');
      const byRate = (a, b) => (b.enough - a.enough) || byName(a, b);
      const ids = (state.settings.classList ?? []).filter(id => !grade || id.startsWith(`${grade}-`));
      const rate = list => ({ tries: list.length, points: list.length ? Math.round((list.filter(a => a.ok).length / list.length) * 100) : 0 });
      const tried = id => state.attempts.filter(a => a.classId === id && a.ts >= since);
      if (type === 'class') {
        return ids.map(id => {
          const r = rate(tried(id));
          return { id, name: id, classId: id, students: getClass(id).students.length, ...r, enough: r.tries >= 10 };
        }).sort(byRate);
      }
      if (type === 'student') {
        return ids.flatMap(id => {
          const mine = tried(id);
          return getClass(id).students.map(st => {
            const r = rate(mine.filter(a => a.studentId === st.id));
            return { ...st, classId: id, ...r, enough: r.tries >= 5 };
          });
        }).sort(byRate);
      }
      return ids.flatMap(id => standings(id, { type, since }).map(r => ({ ...r, classId: id }))).sort(byName);
    },
    addAttempt({ classId, level, ok, activity, eventId, studentId }) {
      const a = { id: uid(), classId, level, ok: !!ok, activity, eventId, studentId, ts: now() };
      state.attempts.push(a);
      save();
      return a;
    },
    attemptsOf(classId, { since = 0 } = {}) {
      return state.attempts.filter(a => a.classId === classId && a.ts >= since);
    },
    classLevel(classId) {
      const L = state.settings[`level:${classId}`];
      return LEVELS.includes(L) ? L : 'A1';
    },
    setClassLevel(classId, L) {
      if (!LEVELS.includes(L)) throw new Error(`Bilinmeyen seviye: ${L}`);
      state.settings[`level:${classId}`] = L;
      // Elle ayar: önceki denemeler bir sonraki hesapta sayılmasın
      state.settings[`levelSince:${classId}`] = now();
      state.settings[`levelDay:${classId}`] = dayKey(now());
      save();
    },
    // Gün değişince önceki dersin denemeleriyle sınıf seviyesi yeniden hesaplanır.
    ensureDailyLevel(classId, today = dayKey(now())) {
      const dayKeyName = `levelDay:${classId}`;
      if (state.settings[dayKeyName] !== today) {
        const since = state.settings[`levelSince:${classId}`];
        if (since !== undefined) {
          state.settings[`level:${classId}`] = nextLevel(this.classLevel(classId), this.attemptsOf(classId, { since }));
        }
        state.settings[`levelSince:${classId}`] = now();
        state.settings[dayKeyName] = today;
        save();
      }
      return this.classLevel(classId);
    },
    getSetting(key, fallback = null) { return key in state.settings ? state.settings[key] : fallback; },
    setSetting(key, value) { state.settings[key] = value; save(); },
    export() { return JSON.stringify(state, null, 2); },
    import(json) {
      let parsed;
      try { parsed = JSON.parse(json); } catch { throw new Error('Dosya okunamadı (JSON değil).'); }
      if (!isValidState(parsed)) throw new Error('Bu dosya bir sınıf ligi yedeği değil.');
      state = { ...emptyState(), ...parsed };
      save();
    },
  };
}
