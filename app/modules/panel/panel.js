import { h, icon, lockKey } from '../../core/dom.js';
import { loadIndex, loadUnit } from '../../core/content.js';
import { lessonInfo } from '../../core/lesson-plan.js';
import { games } from '../registry.js';
import { weekStart } from '../../core/store.js';
import { levelUp } from '../../core/levels.js';

const GAME_ICONS = { 'pre-season': 'trophy', 'coach-says': 'person-simple-run', 'mock-interview': 'microphone-stage', 'warmup-dj': 'music-notes' };
// Ünitenin görev oyunu yalnız ilgili ünitede görünür
const UNIT_GAME = { 'mock-interview': 'interview', 'warmup-dj': 'dj', 'pre-season': 'camp' };

export default {
  async mount(el, ctx) {
    const onChange = () => ctx.rerender(); // geri al sonrası haftalık şerit güncellensin
    document.addEventListener('scores-changed', onChange);
    this.unmount = () => document.removeEventListener('scores-changed', onChange);
    const cls = ctx.store.getClass(ctx.classId);
    const level = ctx.store.classLevel(ctx.classId);
    const index = await loadIndex();
    const { unit } = await loadUnit(ctx.grade, ctx.unit);
    const visibleGames = games.filter(g => !g.hidden && (!UNIT_GAME[g.id] || unit?.[UNIT_GAME[g.id]]));
    // Bugünün dersi (4 derslik ünite planı)
    const info = unit ? lessonInfo(unit, ctx.lessonProgress()) : null;
    const STEP = { attendance: 'Yoklama', coach: s => (s.phase === 'speak' ? 'Coach Says · konuşma' : 'Coach Says · hareket'), mission: 'Görev oyunu', video: 'Video', book: 'Kitap', song: 'Şarkı molası', boss: 'Boss Round', exit: 'Çıkış bileti' };
    const stepName = s => (typeof STEP[s.type] === 'function' ? STEP[s.type](s) : STEP[s.type] ?? s.type);
    const lessonCard = !info ? null : info.unitDone
      ? h('div', { class: 'lesson-card is-done' },
        h('span', { class: 'lesson-title' }, `Unit ${ctx.unit} tamamlandı · ${info.total} ders`),
        h('button', { class: 'ghost', onclick: () => { ctx.store.setSetting(`lesson:${ctx.classId}:${ctx.unit}`, { lesson: 0, step: 0 }); ctx.rerender(); } }, 'Baştan başla'))
      : h('div', { class: 'lesson-card' },
        h('div', { class: 'lesson-head' },
          h('span', { class: 'lesson-title' }, `Bugün: Ders ${info.number}/${info.total} · ${info.title.replace(/^Ders \d+ · /, '')}`),
          ctx.inLesson() ? h('button', { class: 'ghost', onclick: () => { ctx.stopLesson(); ctx.rerender(); } }, 'Dersi durdur') : null,
          h('button', { class: 'go lesson-go', onclick: () => ctx.startLesson() }, icon('play'), info.stepIndex > 0 ? ' Devam et' : ' Derse başla')),
        h('ol', { class: 'lesson-steps' }, info.steps.map((s, k) => h('li', { class: k < info.stepIndex ? 'is-done' : k === info.stepIndex ? 'is-now' : '' }, stepName(s)))));
    const available = index[ctx.grade] ?? [];
    const pickUnit = n => { ctx.store.setSetting(`unit:${ctx.classId}`, n); ctx.rerender(); };

    const week = ctx.store.standings(ctx.classId, { since: weekStart(Date.now()) });
    // Şubenin bu haftaki okul sırası (başarı oranı)
    const school = ctx.store.schoolStandings({ type: 'class', since: weekStart(Date.now()) });
    const mine = school.findIndex(r => r.id === ctx.classId);
    const schoolRank = school.length > 1 && mine >= 0 && school[mine].enough ? school.findIndex(r => r.points === school[mine].points) + 1 : null;
    el.append(h('section', { class: 'screen panel' },
      h('div', { class: 'panel-head' },
        h('div', { class: 'title-row' },
          h('h1', { class: 'display' }, ctx.classId),
          h('button', { class: 'today-btn', onclick: () => ctx.go('#/today') }, icon('users-three'), ` Bugün ${ctx.store.presentStudents(ctx.classId).length}/${cls.students.length}`),
          h('span', { class: 'tape level-badge' }, level === 'B2' ? 'Seviye B2 · en üst seviye' : `Seviye ${level} · %80 ile ${levelUp(level)}`)),
        unit?.goals ? h('p', { class: 'goals' }, h('b', {}, `Unit ${ctx.unit} · ${unit.title} — hedef: `), unit.goals.join(' · ')) : null,
        h('div', { class: 'unit-row', role: 'group', 'aria-label': 'Ünite' },
          Array.from({ length: 10 }, (_, i) => i + 1).map(n => h('button', {
            class: `unit-btn${n === ctx.unit ? ' is-active' : ''}`,
            disabled: !available.includes(n),
            onclick: () => pickUnit(n),
          }, String(n))))),
      cls.teams.length ? null : h('p', { class: 'tape callout' }, 'Bu sınıfta henüz takım yok. ', h('a', { href: '#/setup' }, 'Takımları kur')),
      lessonCard,
      h('p', { class: 'free-label' }, 'Serbest etkinlikler'),
      h('div', { class: 'tiles' },
        visibleGames.map((g, i) => h('button', { class: `tile game${g.id === 'coach-says' ? ' primary' : ''}`, onclick: () => ctx.go(`#/game/${g.id}`) }, icon(GAME_ICONS[g.id] ?? 'play'), h('span', { lang: 'en' }, g.title.toLocaleUpperCase('en')))),
        h('button', { class: 'tile', onclick: () => ctx.go('#/league') }, icon('trophy'), 'Lig'),
        h('button', { class: 'tile', onclick: () => ctx.go('#/setup') }, icon('users-three'), 'Takımlar')),
      week.length ? h('button', { class: 'mini-league', 'aria-label': 'Bu haftanın takım ligi', onclick: () => ctx.go('#/league') },
        h('span', { class: 'mini-title' }, 'Bu hafta', schoolRank ? h('span', { class: 'tape school-rank' }, `Okulda ${schoolRank}. sıra`) : null),
        week.map(t => h('span', { class: 'mini-door', style: { '--team': `var(--${t.color})` } },
          lockKey(),
          h('span', { class: 'stencil' }, String(t.points)), h('span', { class: 'mini-name' }, t.name)))) : null));
  },
};
