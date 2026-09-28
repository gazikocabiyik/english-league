import { h, icon, toast } from '../../core/dom.js';
import { loadUnit } from '../../core/content.js';
import { lessonLevels } from '../../core/levels.js';
import { award } from '../league/award.js';

// Kitap sayfası görevi: "Kitap s.X'i açın"; Doğru/Yanlış kartları takım yarışı, kısa cevaplar takım yarışı.
// Kitap metni kopyalanmaz: maddeler kendi cümlelerimizle yazılır.
export default {
  id: 'book-task',
  title: 'Kitap',
  hidden: true, // panelde kutu değil, ders planı adımı
  unmount() {},
  async mount(el, ctx, [id] = []) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    let audio = null;
    this.unmount = () => { alive = false; ctx.sound.stopSpeaking(); audio?.pause(); };
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;
    const next = () => ctx.finishActivity('#/panel');
    const task = unit?.book?.find(b => b.id === id) ?? unit?.book?.[0];
    if (!task) {
      el.replaceChildren(h('section', { class: 'screen' }, h('h1', { class: 'display' }, 'Bu ünitede kitap görevi yok'),
        h('button', { class: 'go', onclick: next }, 'Sonraki adım ', icon('caret-right'))));
      return;
    }
    // Kitabın dinleme sesi (ör. Audio 1.5): ekran boyunca tek çalar; ekrandan çıkınca durur
    const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    let timeEl = null;
    let playBtn = null;
    if (task.audio) {
      audio = new Audio(`content/${ctx.grade}/${task.audio}`);
      audio.preload = 'auto';
      const sync = () => {
        if (timeEl) timeEl.textContent = `${mmss(audio.currentTime)} / ${mmss(audio.duration || 0)}`;
        if (timeEl) timeEl.style.setProperty('--p', audio.duration ? audio.currentTime / audio.duration : 0);
        if (playBtn) playBtn.replaceChildren(icon(audio.paused ? 'play' : 'pause'), audio.paused ? ` ${task.track ?? 'Audio'} · Dinle` : ' Duraklat');
      };
      for (const ev of ['timeupdate', 'play', 'pause', 'ended', 'loadedmetadata']) audio.addEventListener(ev, sync);
      audio.addEventListener('error', () => toast('Ses açılamadı'));
      this.syncAudio = sync;
    }
    const player = () => {
      if (!audio) return null;
      playBtn = h('button', { class: 'go audio-play', onclick: () => { ctx.sound.stopSpeaking(); if (audio.paused) audio.play().catch(() => toast('Ses açılamadı')); else audio.pause(); } });
      timeEl = h('span', { class: 'audio-time' });
      const bar = h('div', { class: 'audio-bar' },
        playBtn,
        h('button', { class: 'ghost small', 'aria-label': '10 saniye geri', onclick: () => { audio.currentTime = Math.max(0, audio.currentTime - 10); } }, icon('arrow-counter-clockwise'), ' 10 sn'),
        h('button', { class: 'ghost small', onclick: () => { audio.currentTime = 0; audio.play().catch(() => {}); } }, 'Baştan'),
        timeEl);
      this.syncAudio?.();
      return bar;
    };
    const level = lessonLevels(ctx.store.classLevel(ctx.classId)).speak;
    const cls = ctx.store.getClass(ctx.classId);
    let i = -1; // -1 = "kitabı açın" ekranı
    let reveal = false;
    let last = 0;
    const once = () => { if (Date.now() - last < 500) return false; last = Date.now(); return true; };
    const answerText = it => ('answer' in it ? (it.answer ? 'TRUE' : 'FALSE') : it.a);

    function mark(team) {
      if (!once()) return;
      let eventId;
      if (team) eventId = award(ctx, 'team', team, 1, 'Kitap')?.id;
      ctx.store.addAttempt({ classId: ctx.classId, level, ok: !!team, activity: 'book', eventId });
      if (!team) toast('Kimse bilemedi');
      reveal = false;
      i++;
      if (i >= task.items.length) next(); else render(true);
    }

    function render(announce) {
      const head = h('header', { class: 'coach-head' },
        h('span', { class: 'tape lucky-name' }, `Kitap s.${task.page} · ${task.title}`),
        h('span', { class: 'spacer' }),
        h('span', { class: 'level-chip' }, level),
        i >= 0 ? h('span', { class: 'progress' }, `${i + 1} / ${task.items.length}`) : null,
        h('button', { class: 'ghost', onclick: next }, 'Etkinliği atla'));
      let body;
      if (i < 0) {
        body = h('div', { class: 'stage stage-move book-open' },
          h('p', { class: 'command is-short' }, `Kitap s.${task.page}`),
          h('p', { class: 'book-instruction' }, task.instruction),
          player(),
          h('button', { class: 'go wide', onclick: () => { i = 0; render(true); } }, 'Hazırız ', icon('caret-right')));
      } else {
        const it = task.items[i];
        const text = it.text ?? it.q;
        body = h('div', { class: 'stage video-q' },
          player(),
          h('p', { class: 'small-label' }, 'answer' in it ? 'True or false?' : 'Answer the question'),
          h('button', { class: 'question', lang: 'en', onclick: () => ctx.sound.speak(text) }, text),
          reveal ? h('p', { class: 'frame', lang: 'en' }, answerText(it)) : h('button', { class: 'ghost small', onclick: () => { reveal = true; render(false); } }, 'Cevabı göster'),
          h('div', { class: 'team-buttons' },
            cls.teams.map(t => h('button', { class: 'team-btn', style: { '--team': `var(--${t.color})` }, onclick: () => mark(t) }, t.name)),
            h('button', { class: 'nobody', onclick: () => mark(null) }, 'Kimse bilemedi')));
        if (announce && (!audio || audio.paused)) ctx.sound.speak(text); // kitap sesi çalarken okuma yapma
      }
      el.replaceChildren(h('section', { class: 'screen coach book' }, head, body));
    }
    render(false);
  },
};
