import { h, icon, seg, toast } from '../../core/dom.js';
import { buildRoster, balanceTeams } from '../league/roster.js';

export default {
  // step: 'students' (yeni şube 1/2), 'groups' (yeni şube 2/2) ya da boş (tam düzenleme + yedek)
  mount(el, ctx, [step] = []) {
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

    function save(next = '#/panel') {
      const roster = buildRoster(names.value, count, cls);
      // Grup sayısı değişince yeni gruplar boş kalmasın
      if (count !== cls.teams.length) roster.students = balanceTeams(roster.students, roster.teams);
      roster.teams.forEach((t, i) => { t.name = teamNames[i]?.trim() || t.name; });
      if (!roster.students.length) { toast('En az bir öğrenci adı yaz'); return; }
      ctx.store.saveClass(ctx.classId, roster);
      document.dispatchEvent(new CustomEvent('scores-changed'));
      toast(`${roster.students.length} öğrenci, ${roster.teams.length} grup kaydedildi`);
      ctx.go(next);
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

    renderTeams();
    const teamCol = h('div', { class: 'setup-col' }, h('p', {}, 'Grup sayısı'), countSeg, teamInputs);
    const nameCol = h('div', { class: 'setup-col' }, h('p', {}, 'Öğrenciler (her satıra bir ad)'), names);
    if (step === 'students') {
      el.append(h('section', { class: 'screen setup one' },
        h('h1', { class: 'display' }, `${ctx.classId} · 1/2 Öğrenciler`),
        h('p', { class: 'hint' }, 'Sınıf listesini buraya yapıştır ya da yaz. Bir sonraki adımda gruplar kurulacak.'),
        nameCol,
        h('div', { class: 'setup-actions' }, h('button', { class: 'go wide', onclick: () => save('#/setup/groups') }, 'İleri: Gruplar ', icon('caret-right')))));
      queueMicrotask(() => names.focus());
      return;
    }
    if (step === 'groups') {
      el.append(h('section', { class: 'screen setup one' },
        h('h1', { class: 'display' }, `${ctx.classId} · 2/2 Gruplar`),
        h('p', { class: 'hint' }, `${cls.students.length} öğrenci gruplara dengeli dağıtılacak. Grup üyelerini her ders başında "Bugünün grupları" ekranından değiştirebilirsin.`),
        teamCol,
        h('div', { class: 'setup-actions' },
          h('button', { class: 'ghost', onclick: () => ctx.go('#/setup/students') }, icon('caret-left'), ' Öğrenciler'),
          h('button', { class: 'go wide', onclick: () => save('#/today') }, icon('check'), ' Kaydet ve yoklamaya geç'))));
      return;
    }
    el.append(h('section', { class: 'screen setup' },
      h('h1', { class: 'display' }, `${ctx.classId} · Takımlar`),
      teamCol,
      nameCol,
      h('div', { class: 'setup-actions' },
        h('button', { class: 'go wide', onclick: () => save() }, icon('check'), ' Kaydet'),
        h('button', { class: 'ghost', onclick: () => ctx.go('#/panel') }, 'Vazgeç')),
      h('div', { class: 'backup' },
        h('span', {}, 'Ayarlar · Yedek'),
        h('button', { onclick: () => ctx.go('#/cloud') }, icon('cloud-check'), ' Bulut (5 tahta tek lig)'),
        h('button', { onclick: download }, icon('download-simple'), ' Yedeği indir'),
        h('button', { onclick: () => fileInput.click() }, icon('upload-simple'), ' Yedeği yükle'),
        fileInput)));
  },
};
