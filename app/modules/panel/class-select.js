import { h, icon, lockKey, seg, toast } from '../../core/dom.js';
import { makeClassId, sortClassIds } from '../../core/classes.js';

export default {
  mount(el, ctx) {
    let editing = false;
    let adding = false;
    let grade = 11;

    const list = () => sortClassIds(ctx.store.classIds());
    const saveList = ids => ctx.store.setSetting('classList', sortClassIds(ids));

    function add(section) {
      try {
        const id = makeClassId(grade, section);
        if (list().includes(id)) { toast(`${id} zaten var`); return; }
        saveList([...list(), id]);
        ctx.store.setSetting('removedClasses', ctx.store.getSetting('removedClasses', []).filter(x => x !== id));
        adding = false;
        // Yeni şube: önce öğrenciler, sonra gruplar
        ctx.store.setSetting('lastClass', id);
        ctx.go('#/setup/students');
      } catch (e) {
        toast(e.message);
      }
    }

    function remove(id) {
      if (!confirm(`${id} listeden kaldırılsın mı? Puanlar silinmez; aynı adla yeniden eklenirse geri gelir.`)) return;
      saveList(list().filter(x => x !== id));
      // Diğer tahtalar da bu şubeyi göstermesin
      ctx.store.setSetting('removedClasses', [...new Set([...ctx.store.getSetting('removedClasses', []), id])]);
      if (ctx.classId === id) ctx.store.setSetting('lastClass', null);
      render();
      ctx.refreshTopbar();
    }

    function locker(id) {
      const cls = ctx.store.getClass(id);
      const [g, s] = id.split('-');
      const label = cls.teams.length ? `${cls.teams.length} takım · ${cls.students.length} öğrenci` : 'Takım kurulmadı';
      return h('div', { style: { position: 'relative', display: 'grid' } },
        h('button', {
          class: `locker${id === ctx.classId ? ' is-last' : ''}`,
          'aria-label': `${id} sınıfını aç`,
          disabled: editing,
          onclick: () => {
            ctx.store.setSetting('lastClass', id);
            // Öğrencisiz şube kuruluma, dersin ilk açılışı yoklamaya gider
            if (!cls.students.length) ctx.go('#/setup/students');
            else ctx.go(ctx.store.isAttendanceDone(id) ? '#/panel' : '#/today');
          },
        },
          h('span', { class: 'num' }, g),
          editing ? null : lockKey(),
          h('span', { class: 'handle', 'aria-hidden': 'true' }),
          h('span', {}, h('span', { class: 'sec' }, s), h('br'), h('span', { class: 'tape' }, label))),
        editing ? h('button', { class: 'locker-del', 'aria-label': `${id} kaldır`, onclick: () => remove(id) }, icon('trash')) : null);
    }

    function addForm() {
      const input = h('input', { 'aria-label': 'Şube adı', placeholder: 'L', maxlength: 5, onkeydown: e => { if (e.key === 'Enter') add(input.value); } });
      queueMicrotask(() => input.focus());
      return h('div', { class: 'add-form' },
        seg([[11, '11. sınıf'], [12, '12. sınıf']], grade, v => { grade = v; render(); }),
        input,
        h('button', { class: 'go', onclick: () => add(input.value) }, icon('check'), ' Ekle'),
        h('button', { class: 'ghost', onclick: () => { adding = false; render(); } }, 'Vazgeç'));
    }

    function render() {
      const ids = list();
      el.replaceChildren(h('section', { class: 'screen class-select' },
        h('div', { class: 'select-head' },
          h('h1', { class: 'display' }, 'Hangi sınıf?'),
          ids.length ? h('button', { class: 'ghost', onclick: () => { editing = !editing; render(); } }, icon(editing ? 'check' : 'pencil-simple'), editing ? ' Bitti' : ' Düzenle') : null),
        adding ? addForm() : null,
        h('div', { class: 'lockers' },
          ids.map(locker),
          adding ? null : h('button', { class: 'locker-add', onclick: () => { adding = true; editing = false; render(); } }, icon('plus'), 'Şube ekle')),
        ids.length ? null : h('p', { class: 'hint' }, 'Önce şubelerini ekle: sınıfı seç, şube harfini yaz (örn. 11 + L).')));
    }

    render();
  },
};
