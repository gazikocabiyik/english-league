import { h, icon, toast } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { award } from '../league/award.js';
import { formatTime } from '../timer/timer.js';

// Şarkı molası: LyricsTraining yeni sekmede açılır (sözler kopyalanmaz); dönüşte takımlara katılım puanı.
export default {
  id: 'song-break',
  title: 'Şarkı molası',
  hidden: true, // panelde kutu değil, ders planı adımı
  unmount() {},
  async mount(el, ctx, [id] = []) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    let tick = null;
    this.unmount = () => { alive = false; clearInterval(tick); };
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;
    const next = () => ctx.finishActivity('#/panel');
    const song = unit?.songs?.find(s => s.id === id) ?? unit?.songs?.[0];
    if (!song) {
      el.replaceChildren(h('section', { class: 'screen' }, h('h1', { class: 'display' }, 'Bu ünitede şarkı yok'),
        h('button', { class: 'go', onclick: next }, 'Sonraki adım ', icon('caret-right'))));
      return;
    }
    const cls = ctx.store.getClass(ctx.classId);
    const LIMIT = (song.minutes ?? 4) * 60e3;
    let startedAt = null;
    let done = false;
    const clock = h('span', { class: 'stencil song-clock' }, formatTime(LIMIT));

    function finish() {
      if (done) return;
      done = true;
      clearInterval(tick);
      const g = `song-${Date.now()}`;
      const present = new Set(ctx.store.presentStudents(ctx.classId).map(s => s.teamId));
      for (const t of cls.teams.filter(t => present.has(t.id))) award(ctx, 'team', t, 1, `Şarkı molası · ${song.title}`, g); // yalnız bugün derste olan takımlar
      toast('Derste olan her takıma +1 katılım puanı');
      next();
    }

    el.replaceChildren(h('section', { class: 'screen coach song' },
      h('header', { class: 'coach-head' }, h('span', { class: 'tape lucky-name' }, icon('music-notes'), ' Şarkı molası'), h('span', { class: 'spacer' }),
        h('button', { class: 'ghost', onclick: next }, 'Etkinliği atla')),
      h('div', { class: 'stage song-card' },
        h('p', { class: 'command is-mid', lang: 'en' }, song.title),
        h('p', { class: 'song-artist', lang: 'en' }, song.artist),
        h('p', { class: 'book-instruction' }, song.why),
        h('p', { class: 'hint' }, 'LyricsTraining\'de "Beginner" seviyesini seç; şarkıyı sınıfça tamamlayın.'),
        h('div', { class: 'today-actions' },
          h('a', { class: 'go-link', href: song.lyricsTrainingUrl, target: '_blank', rel: 'noopener', onclick: () => {
            if (startedAt) return;
            startedAt = Date.now();
            tick = setInterval(() => {
              const left = LIMIT - (Date.now() - startedAt);
              clock.textContent = formatTime(left);
              if (left <= 0) { clearInterval(tick); ctx.sound.whistle(); }
            }, 250);
          } }, icon('play'), ' LyricsTraining\'de aç'),
          clock,
          h('button', { class: 'go', onclick: finish }, icon('check'), ' Tamamladık')))));
  },
};
