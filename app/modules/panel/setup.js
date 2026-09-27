import { h, icon, seg, toast } from '../../core/dom.js';
import { buildRoster } from '../league/roster.js';

export default {
  mount(el, ctx) {
    const cls = ctx.store.getClass(ctx.classId);
    let count = cls.teams.length || 3;
    const teamNames = cls.teams.map(t => t.name);
    const names = h('textarea', { rows: 10, placeholder: 'Her satıra bir öğrenci adı' });
    names.value = cls.students.map(s => s.name).join('\n');
    const countSeg = h('div');
    const teamInputs = h('div', { class: 'team-inputs' });

    function renderTeams() {
      countSeg.replaceChildren(seg([[2, '2'], [3, '3'], [4, '4']], count, v => { count = v; renderTeams(); }));
      teamInputs.replaceChildren(...Array.from({ length: count }, (_, i) => {
        const input = h('input', { 'aria-label': `Takım ${i + 1} adı`, oninput: e => { teamNames[i] = e.target.value; } });
        input.value = teamNames[i] ?? `Team ${String.fromCharCode(65 + i)}`;
        return h('label', { class: 'team-input', style: { '--team': `var(--team-${i + 1})` } }, h('span', { class: 'door stencil', 'aria-hidden': 'true' }, String(i + 1)), input);
      }));
    }

    function save() {
      const roster = buildRoster(names.value, count, cls);
      roster.teams.forEach((t, i) => { t.name = teamNames[i]?.trim() || t.name; });
      ctx.store.saveClass(ctx.classId, roster);
      document.dispatchEvent(new CustomEvent('scores-changed'));
      toast(`${roster.students.length} öğrenci, ${roster.teams.length} takım kaydedildi`);
      ctx.go('#/panel');
    }

    function download() {
      const a = h('a', {
        href: URL.createObjectURL(new Blob([ctx.store.export()], { type: 'application/json' })),
        download: `sinif-ligi-yedek-${new Date().toISOString().slice(0, 10)}.json`,
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onchange: async e => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file || !confirm('Yedek yüklenirse bu tahtadaki TÜM sınıfların verisi yedektekiyle değişir. Devam edilsin mi?')) return;
      try {
        ctx.store.import(await file.text());
        document.dispatchEvent(new CustomEvent('scores-changed'));
        toast('Yedek yüklendi');
        ctx.go('#/panel');
      } catch (err) {
        toast(err.message);
      }
    } });

    const levelSeg = h('div');
    const renderLevel = () => levelSeg.replaceChildren(seg([['A1', 'A1'], ['A2', 'A2'], ['B1', 'B1']], ctx.store.classLevel(ctx.classId), v => {
      ctx.store.setClassLevel(ctx.classId, v); toast(`Seviye ${v} olarak ayarlandı`); renderLevel();
    }));
    renderLevel();
    renderTeams();
    el.append(h('section', { class: 'screen setup' },
      h('h1', { class: 'display' }, `${ctx.classId} · Takımlar`),
      h('div', { class: 'setup-col' }, h('p', {}, 'Takım sayısı'), countSeg, teamInputs,
        h('p', {}, 'Sınıf seviyesi (dersler sonunda kendiliğinden güncellenir; gerekirse düzelt)'), levelSeg),
      h('div', { class: 'setup-col' }, h('p', {}, 'Öğrenciler (her satıra bir ad; sırayla takımlara dağıtılır)'), names),
      h('div', { class: 'setup-actions' },
        h('button', { class: 'go wide', onclick: save }, icon('check'), ' Kaydet'),
        h('button', { class: 'ghost', onclick: () => ctx.go('#/panel') }, 'Vazgeç')),
      h('div', { class: 'backup' },
        h('span', {}, 'Ayarlar · Yedek'),
        h('button', { onclick: download }, icon('download-simple'), ' Yedeği indir'),
        h('button', { onclick: () => fileInput.click() }, icon('upload-simple'), ' Yedeği yükle'),
        fileInput)));
  },
};
