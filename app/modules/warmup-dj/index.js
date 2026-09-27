import { h, icon, toast } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { lessonLevels } from '../../core/levels.js';
import { award } from '../league/award.js';
import { createDJ } from './dj.js';

export default {
  id: 'warmup-dj',
  title: 'Warm-up DJ',
  unmount() {},
  async mount(el, ctx) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    this.unmount = () => { alive = false; };
    const { unit, errors } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;

    const back = h('button', { onclick: () => ctx.go('#/panel') }, 'Panele dön');
    if (!unit) {
      el.replaceChildren(h('section', { class: 'screen error' }, h('h1', { class: 'display' }, 'Ünite açılamadı'), h('ul', {}, errors.map(e => h('li', {}, e))), back));
      return;
    }
    if (!unit.dj) {
      el.replaceChildren(h('section', { class: 'screen' },
        h('h1', { class: 'display' }, 'Bu ünitede Warm-up DJ yok'),
        h('p', { class: 'hint' }, 'Warm-up DJ 12. sınıf 1. ünitede (Music) oynanır.'), back));
      return;
    }

    const cls = ctx.store.getClass(ctx.classId);
    const present = ctx.store.presentStudents(ctx.classId);
    if (!present.length) {
      el.replaceChildren(h('section', { class: 'screen' }, h('h1', { class: 'display' }, 'Warm-up DJ'),
        h('p', { class: 'tape callout' }, 'Bugün derste öğrenci yok. ', h('a', { href: '#/today' }, 'Yoklamayı aç')), back));
      return;
    }

    // Uyarlanır seviye: ünite görevi sınıf seviyesinin bir üstünde (L+1)
    const level = lessonLevels(ctx.store.ensureDailyLevel(ctx.classId)).interview;
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const pickedToday = ctx.store.attemptsOf(ctx.classId, { since: dayStart.getTime() }).filter(a => a.activity === 'dj' && a.studentId).map(a => a.studentId);
    const dj = createDJ(unit, { level, students: present, pickedToday });
    const teamOf = s => cls.teams.find(t => t.id === s.teamId);

    let last = 0;
    const once = () => { if (Date.now() - last < 500) return false; last = Date.now(); return true; };

    function mark(ok) {
      if (!once()) return;
      const s = dj.current;
      if (dj.step === 'choose' && !dj.genre) { toast('Önce öğrencinin seçtiği türe dokun'); return; }
      let eventId;
      if (ok) {
        const groupId = `dj-${Date.now()}-${s.id}`;
        const se = award(ctx, 'student', s, 1, 'Warm-up DJ', groupId);
        const team = teamOf(s);
        const te = team ? award(ctx, 'team', team, 1, `Warm-up DJ · ${s.name}`, groupId) : null;
        eventId = (te ?? se)?.id;
      }
      ctx.store.addAttempt({ classId: ctx.classId, level: dj.level, ok, activity: 'dj', eventId, studentId: s.id });
      const wasChoose = dj.step === 'choose';
      dj.mark();
      render(!dj.done && wasChoose === false);
    }

    const onKey = e => { if (e.key === 'Escape') ctx.go('#/panel'); };
    document.addEventListener('keydown', onKey);
    this.unmount = () => { alive = false; document.removeEventListener('keydown', onKey); ctx.sound.stopSpeaking(); };

    const person = (label, s) => {
      const t = s && teamOf(s);
      return h('span', { class: 'role tape' },
        h('span', { class: 'role-door', style: { '--team': t ? `var(--${t.color})` : 'var(--surface-2)' } }),
        h('span', { class: 'role-name' }, `${label}: `, h('b', {}, s?.name ?? '—')));
    };

    function playlist() {
      return h('div', { class: 'stage playlist' },
        h('p', { class: 'playlist-title', lang: 'en' }, 'WARM-UP PLAYLIST'),
        h('ol', { class: 'playlist-list' }, dj.playlist.map(p => h('li', { lang: 'en' },
          h('span', { class: 'pl-situation' }, p.situation), h('span', { class: 'pl-genre' }, p.genre.toLocaleUpperCase('en')), h('span', { class: 'pl-by' }, p.by)))),
        h('button', { class: 'go wide', onclick: () => ctx.go('#/panel') }, icon('check'), ' Bitti'));
    }

    function render(announce) {
      if (dj.done) {
        el.replaceChildren(h('section', { class: 'screen coach dj' },
          h('header', { class: 'coach-head' }, h('span', { class: 'level-chip' }, dj.level), h('span', { class: 'progress' }, `${dj.total} / ${dj.total}`)),
          playlist()));
        return;
      }
      const sit = dj.situation;
      const choosing = dj.step === 'choose';
      const genreTiles = h('div', { class: 'genres' }, dj.genres().map(g => h('button', {
        class: `genre${dj.genre === g.word ? ' is-on' : ''}`, lang: 'en', disabled: !choosing,
        onclick: () => { dj.setGenre(g.word); ctx.sound.speak(g.word); render(false); },
      }, h('img', { src: `content/${g.img}`, alt: '' }), h('span', {}, g.word.toLocaleUpperCase('en')))));

      const lines = choosing
        ? h('p', { class: 'frame', lang: 'en' }, dj.line())
        : h('div', { class: 'replies' },
          h('p', { class: 'said', lang: 'en' }, `${dj.chooser.name}: ${unit.dj.lines[dj.level].choose.replace('___', dj.genre)}`),
          dj.line().map(r => h('p', { class: 'frame', lang: 'en' }, r)));

      el.replaceChildren(h('section', { class: 'screen coach dj' },
        h('header', { class: 'coach-head' },
          h('div', { class: 'roles' }, person(choosing ? 'Seçiyor' : 'Seçti', dj.chooser), dj.responder ? person(choosing ? 'Sonra cevaplar' : 'Cevaplıyor', dj.responder) : null),
          h('span', { class: 'level-chip', title: 'Oyun seviyesi' }, dj.level),
          h('span', { class: 'progress' }, `${dj.round + 1} / ${dj.total}`)),
        h('div', { class: 'stage dj-stage' },
          h('button', { class: 'situation', lang: 'en', onclick: () => ctx.sound.speak(sit.text) }, sit.text, sit.tr ? h('small', { lang: 'tr' }, sit.tr) : null),
          genreTiles,
          lines,
          h('div', { class: 'scores one' },
            h('span', { class: 'person-label' }, `${dj.current?.name} ${choosing ? 'türünü seçip savundu mu?' : 'katılıp katılmadığını söyledi mi?'}`),
            h('button', { class: 'go', onclick: () => mark(true) }, icon('check'), ' Doğru'),
            h('button', { class: 'nobody', onclick: () => mark(false) }, icon('x'), ' Bilemedi'),
            h('button', { class: 'ghost small', onclick: () => { dj.skipPerson(); render(false); } }, 'Başka öğrenci')))));
      if (announce) ctx.sound.speak(sit.text);
    }

    render(true);
  },
};
