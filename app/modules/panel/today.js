import { h, icon, toast } from '../../core/dom.js';
import { balanceTeams, setTeam } from '../league/roster.js';

// Ders başı: son dersin grupları hazır gelir. Gelmeyene dokun → "yok"; takım düğmesiyle istenen gruba al; "Dengele" eşitler.
export default {
  mount(el, ctx) {
    const cls = ctx.store.getClass(ctx.classId);
    if (!cls.students.length) { ctx.go('#/setup/students'); return; }
    let students = cls.students;
    // Eski (silinmiş/yeniden adlandırılmış) öğrenci kimlikleri sayılmasın
    const absent = new Set(ctx.store.absentIds(ctx.classId).filter(id => cls.students.some(s => s.id === id)));

    const persist = () => ctx.store.saveClass(ctx.classId, { teams: cls.teams, students });

    function start() {
      persist();
      ctx.store.setAbsent(ctx.classId, [...absent]);
      toast(`Bugün ${students.length - absent.size} öğrenci derste`);
      // Yarım kalan derse dönülüyorsa yoklamadan sonra ders devam eder
      if (ctx.store.getSetting(`resumeLesson:${ctx.classId}`)) { ctx.store.setSetting(`resumeLesson:${ctx.classId}`, null); ctx.startLesson(); return; }
      ctx.finishActivity('#/panel'); // ders planındaysa sıradaki adıma
    }

    // Yeni eklenen öğrenciler (Grupları düzenle'den gelince) "yeni" etiketiyle görünür
    const fresh = new Set(ctx.newStudents?.[ctx.classId] ?? []);

    // Takım seçimi: öğrenci istenen takıma tek dokunuşla alınır
    function chooseTeam(s) {
      const close = () => sheet.remove();
      const sheet = h('div', { class: 'sheet-backdrop', onclick: e => { if (e.target === sheet) close(); } },
        h('div', { class: 'sheet' },
          h('p', { class: 'sheet-title' }, `${s.name} hangi takımda?`),
          h('div', { class: 'team-buttons' }, cls.teams.map(t => h('button', {
            class: `team-btn${t.id === s.teamId ? ' is-current' : ''}`, style: { '--team': `var(--${t.color})` },
            onclick: () => { students = setTeam(students, cls.teams, s.id, t.id); persist(); close(); render(); },
          }, t.name))),
          h('button', { class: 'ghost', onclick: close }, 'Vazgeç')));
      document.body.append(sheet);
    }

    function card(s) {
      const away = absent.has(s.id);
      return h('div', { class: `kid${away ? ' is-away' : ''}` },
        fresh.has(s.id) ? h('span', { class: 'tape kid-new' }, 'yeni') : null,
        h('button', { class: 'kid-name', 'aria-pressed': String(!away), onclick: () => { away ? absent.delete(s.id) : absent.add(s.id); ctx.store.setAbsent(ctx.classId, [...absent]); render(); } }, // dokunuş anında kaydedilir
          s.name, away ? h('span', { class: 'kid-away' }, 'yok') : null),
        cls.teams.length > 1 && !away
          ? h('button', { class: 'kid-move', 'aria-label': `${s.name} için takım seç`, onclick: () => chooseTeam(s) }, icon('users-three'))
          : null);
    }

    function render() {
      const here = students.length - absent.size;
      const actions = h('div', { class: 'today-actions' },
        h('button', { onclick: () => { students = balanceTeams(students, cls.teams, [...absent]); persist(); toast('Gruplar dengelendi'); render(); } }, icon('users-three'), ' Dengele'),
        h('button', { class: 'ghost', onclick: () => ctx.go('#/setup') }, 'Grupları düzenle'),
        h('button', { class: 'go', onclick: start }, icon('check'), ' Derse başla'));
      el.replaceChildren(h('section', { class: 'screen today' },
        h('div', { class: 'title-row' },
          h('h1', { class: 'display today-title' }, `${ctx.classId} · Bugün`),
          h('span', { class: 'tape level-badge' }, `${here} / ${students.length} burada`),
          h('span', { class: 'spacer' }),
          actions),
        h('p', { class: 'hint' }, 'Gelmeyen öğrenciye dokun. Takımını değiştirmek için yanındaki takım düğmesine dokun.'),
        h('div', { class: 'groups' }, cls.teams.map(t => {
          const mine = students.filter(s => s.teamId === t.id);
          const present = mine.filter(s => !absent.has(s.id)).length;
          return h('div', { class: 'group', style: { '--team': `var(--${t.color})` } },
            h('div', { class: 'group-head' }, h('span', { class: 'group-name' }, t.name), h('span', { class: 'stencil group-count' }, String(present))),
            mine.map(card));
        }))));
    }
    render();
  },
};
