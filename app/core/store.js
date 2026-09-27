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
    // Okul ligi: şubeler (öğrenci başına ortalama), bütün takımlar, bütün öğrenciler
    schoolStandings({ type = 'class', grade = null, since = 0 } = {}) {
      const byName = (a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr');
      const ids = (state.settings.classList ?? []).filter(id => !grade || id.startsWith(`${grade}-`));
      if (type === 'class') {
        return ids.map(id => {
          const n = getClass(id).students.length;
          // Öğrenci puanları + gruplanmamış takım puanları (grup = aynı cevap için öğrenciye de yazılmış puan; iki kez sayılmaz)
          const teams = new Set(getClass(id).teams.map(t => t.id));
          const studentPts = standings(id, { type: 'student', since }).reduce((t, r) => t + r.points, 0);
          const teamPts = state.events.filter(e => e.classId === id && e.targetType === 'team' && !e.groupId && e.ts >= since && teams.has(e.targetId)).reduce((t, e) => t + e.points, 0);
          const total = studentPts + teamPts;
          return { id, name: id, classId: id, students: n, points: n ? Math.round((total / n) * 10) / 10 : 0 };
        }).sort((a, b) => (b.students > 0) - (a.students > 0) || byName(a, b));
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
