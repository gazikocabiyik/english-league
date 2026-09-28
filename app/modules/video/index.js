import { h, icon } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { lessonLevels } from '../../core/levels.js';
import { award } from '../league/award.js';
import { createPicker } from '../coach-says/picker.js';
import { videoQuestions } from './video.js';

// Video + anlama: tahmin sorusu → kısa klip (gömülü, indirilmez) → şanslı öğrenciye sorular
export default {
  id: 'video',
  title: 'Video',
  hidden: true, // panelde kutu değil, ders planı adımı
  unmount() {},
  async mount(el, ctx, [id] = []) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    this.unmount = () => { alive = false; ctx.sound.stopSpeaking(); };
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;
    const next = () => ctx.finishActivity('#/panel');
    const video = unit?.media?.videos?.find(v => v.id === id) ?? unit?.media?.videos?.[0];
    if (!video) {
      el.replaceChildren(h('section', { class: 'screen' }, h('h1', { class: 'display' }, 'Bu ünitede video yok'),
        h('button', { class: 'go', onclick: next }, 'Sonraki adım ', icon('caret-right'))));
      return;
    }

    const level = lessonLevels(ctx.store.ensureDailyLevel(ctx.classId)).speak; // girdi etkinliği: sınıf seviyesi
    const questions = videoQuestions(video, level);
    const cls = ctx.store.getClass(ctx.classId);
    const picker = createPicker(ctx.store.presentStudents(ctx.classId));
    let stage = 'predict';
    let qi = 0;
    let who = picker.pick();
    let reveal = false;
    let last = 0;
    const once = () => { if (Date.now() - last < 500) return false; last = Date.now(); return true; };

    function mark(ok) {
      if (!once() || !who) return;
      let eventId;
      if (ok) {
        const g = `vid-${Date.now()}-${who.id}`;
        const se = award(ctx, 'student', who, 1, 'Video', g);
        const team = cls.teams.find(t => t.id === who.teamId);
        const te = team ? award(ctx, 'team', team, 1, `Video · ${who.name}`, g) : null;
        eventId = (te ?? se)?.id;
      }
      ctx.store.addAttempt({ classId: ctx.classId, level, ok, activity: 'video', eventId, studentId: who.id });
      qi++; reveal = false; who = picker.pick();
      if (qi >= questions.length) next(); else render(true);
    }

    function render(announce) {
      const head = h('header', { class: 'coach-head' },
        h('span', { class: 'tape lucky-name' }, icon('play'), ` ${video.title}`),
        h('span', { class: 'spacer' }),
        h('span', { class: 'level-chip' }, level),
        h('button', { class: 'ghost', onclick: next }, 'Etkinliği atla'));
      let body;
      if (stage === 'predict') {
        body = h('div', { class: 'stage stage-move video-predict' },
          h('p', { class: 'small-label' }, 'İzlemeden önce tahmin et'),
          h('p', { class: 'command is-mid', lang: 'en' }, video.predict),
          h('button', { class: 'go wide', onclick: () => { stage = 'watch'; render(false); } }, icon('play'), ' Videoyu başlat'));
        if (announce) ctx.sound.speak(video.predict);
      } else if (stage === 'watch') {
        const src = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?start=${video.start ?? 0}${video.end ? `&end=${video.end}` : ''}&autoplay=1&rel=0&modestbranding=1`;
        body = h('div', { class: 'stage video-watch' },
          h('iframe', { src, title: video.title, allow: 'autoplay; encrypted-media; fullscreen', allowfullscreen: true }),
          h('div', { class: 'today-actions' },
            h('span', { class: 'hint' }, 'Video açılmazsa (internet yoksa) sorulara geçebilirsin.'),
            h('button', { class: 'go', onclick: () => { if (!questions.length) { next(); return; } stage = 'questions'; render(true); } }, questions.length ? 'İzledik: sorular ' : 'İzledik ', icon('caret-right'))));
      } else {
        const q = questions[qi];
        const team = who && cls.teams.find(t => t.id === who.teamId);
        body = h('div', { class: 'stage video-q' },
          h('p', { class: 'progress' }, `${qi + 1} / ${questions.length}`),
          h('button', { class: 'question', lang: 'en', onclick: () => ctx.sound.speak(q.q) }, q.q),
          reveal ? h('p', { class: 'frame', lang: 'en' }, q.a) : h('button', { class: 'ghost small', onclick: () => { reveal = true; render(false); } }, 'Cevabı göster'),
          who ? h('div', { class: 'lucky' },
            h('span', { class: 'tape lucky-name' }, h('span', { class: 'role-door', style: { '--team': team ? `var(--${team.color})` : 'var(--surface-2)' } }), 'Sıra: ', h('b', {}, who.name)),
            h('button', { class: 'go lucky-ok', onclick: () => mark(true) }, icon('check'), ' Doğru'),
            h('button', { class: 'nobody lucky-no', onclick: () => mark(false) }, icon('x'), ' Bilemedi'),
            h('button', { class: 'ghost small', onclick: () => { who = picker.skip(); render(false); } }, 'Başka öğrenci'))
            : h('p', { class: 'tape callout' }, 'Bugün derste öğrenci yok. ', h('a', { href: '#/today' }, 'Yoklamayı aç')));
        if (announce) ctx.sound.speak(q.q);
      }
      el.replaceChildren(h('section', { class: 'screen coach video' }, head, body));
    }
    render(true);
  },
};
