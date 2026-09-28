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

const emptyState = () => ({ version: 1, classes: {}, events: [], attempts: [], settings: {}, archive: null });
const KEEP_WEEKS = 8; // bu kadar haftadan eski kayıtlar özetlenir (depo dolmasın)

const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);

function isValidState(s) {
  return isObj(s) && s.version === 1 && isObj(s.classes)
    && Object.values(s.classes).every(c => isObj(c) && Array.isArray(c.teams) && Array.isArray(c.students)
      && [...c.teams, ...c.students].every(x => isObj(x) && typeof x.id === 'string' && typeof x.name === 'string'))
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
  let raw = null;
  try {
    raw = backend.getItem(KEY);
    const saved = JSON.parse(raw);
    if (isValidState(saved)) state = { ...emptyState(), ...saved };
    else if (raw) backend.setItem(`${KEY}.bak`, raw); // tanınmayan kayıt silinmeden önce yedeklenir
  } catch {
    try { if (raw) backend.setItem(`${KEY}.bak`, raw); } catch { /* yer yok */ }
  }

  let size = 0;
  function save() {
    if (!persistent) return;
    try { const json = JSON.stringify(state); size = json.length; backend.setItem(KEY, json); } catch { persistent = false; }
  }
  const uid = () => `${now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  function getClass(classId) {
    return state.classes[classId] ?? { teams: [], students: [] };
  }

  function classIds() {
    return state.settings.classList ?? Object.keys(state.classes); // eski yedeklerde classList yok
  }

  // Eski olayları ve denemeleri özetle: puan toplamları ve doğru/deneme sayıları arşivde kalır
  function compact(at = now()) {
    const cutoff = weekStart(at) - KEEP_WEEKS * 7 * 864e5;
    const arch = state.archive ?? { until: 0, events: {}, attempts: {} };
    let removed = 0;
    state.events = state.events.filter(e => {
      if (e.ts >= cutoff) return true;
      const c = (arch.events[e.classId] ??= { team: {}, student: {} });
      c[e.targetType][e.targetId] = (c[e.targetType][e.targetId] ?? 0) + e.points;
      removed++;
      return false;
    });
    state.attempts = state.attempts.filter(a => {
      if (a.ts >= cutoff) return true;
      const c = (arch.attempts[a.classId] ??= { n: 0, ok: 0, students: {} });
      c.n++; if (a.ok) c.ok++;
      if (a.studentId) { const st = (c.students[a.studentId] ??= { n: 0, ok: 0 }); st.n++; if (a.ok) st.ok++; }
      removed++;
      return false;
    });
    if (removed) { arch.until = Math.max(arch.until, cutoff); state.archive = arch; save(); }
    return removed;
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
    if (since === 0 && state.archive?.events?.[classId]) {
      for (const [id, p] of Object.entries(state.archive.events[classId][type] ?? {})) if (pts.has(id)) pts.set(id, pts.get(id) + p);
    }
    return roster.map(r => ({ ...r, points: pts.get(r.id) }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr'));
  }

  compact(); // açılışta eski kayıtları özetle

  return {
    get persistent() { return persistent; },
    // Depo ~5 MB; 4 MB üstünde uyarı gösterilir
    get nearlyFull() { return size > 4e6; },
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
    classIds,
    compact,
    // Okul ligi (adil karşılaştırma): şubeler ve öğrenciler başarı oranıyla (doğru ÷ cevap, %), takımlar puanla
    schoolStandings({ type = 'class', grade = null, since = 0 } = {}) {
      const byName = (a, b) => b.points - a.points || a.name.localeCompare(b.name, 'tr');
      const byRate = (a, b) => (b.enough - a.enough) || byName(a, b);
      const ids = classIds().filter(id => !grade || id.startsWith(`${grade}-`));
      const rate = (list, extra = { n: 0, ok: 0 }) => {
        const n = list.length + (since === 0 ? extra.n : 0);
        const good = list.filter(a => a.ok).length + (since === 0 ? extra.ok : 0);
        return { tries: n, points: n ? Math.round((good / n) * 100) : 0 };
      };
      const arch = id => state.archive?.attempts?.[id];
      const tried = id => state.attempts.filter(a => a.classId === id && a.ts >= since);
      if (type === 'class') {
        return ids.map(id => {
          const r = rate(tried(id), arch(id));
          return { id, name: id, classId: id, students: getClass(id).students.length, ...r, enough: r.tries >= 10 };
        }).sort(byRate);
      }
      if (type === 'student') {
        return ids.flatMap(id => {
          const mine = tried(id);
          return getClass(id).students.map(st => {
            const r = rate(mine.filter(a => a.studentId === st.id), arch(id)?.students?.[st.id]);
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
    // Günlük yoklama: gelmeyenler yalnız o gün için tutulur
    setAbsent(classId, ids, day = dayKey(now())) {
      state.settings[`absent:${classId}`] = { day, ids: [...ids] };
      save();
    },
    absentIds(classId, day = dayKey(now())) {
      const a = state.settings[`absent:${classId}`];
      return a?.day === day ? a.ids : [];
    },
    isAttendanceDone(classId, day = dayKey(now())) {
      return state.settings[`absent:${classId}`]?.day === day;
    },
    presentStudents(classId, day = dayKey(now())) {
      const absent = new Set(this.absentIds(classId, day));
      return getClass(classId).students.filter(s => !absent.has(s.id));
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
