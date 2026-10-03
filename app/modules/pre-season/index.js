import { h, icon, toast } from '../../core/dom.js';
import { loadIndex, loadUnit } from '../../core/content.js';
import { award } from '../league/award.js';
import { coverage } from './coverage.js';
import { countUp, enter } from '../../core/fx.js';

// Ön Kamp: ünitenin 1. dersinin başında hazırbulunuşluk.
// 1) Bu ünite ne kazandırır (hedef, kariyer cümleleri, iletişim payı grafiği)
// 2) Ne biliyoruz (Türkçesinden İngilizce kelime, takım yarışı)
// 3) Hazırlık ölçer (başlangıç oranı; ünite sonunda Boss rozetinde karşılaştırılır, seviyeyi etkilemez)
export default {
  id: 'pre-season',
  title: 'Pre-season Camp',
  unmount() {},
  async mount(el, ctx) {
    el.append(h('p', { class: 'hint' }, 'Yükleniyor…'));
    let alive = true;
    this.unmount = () => { alive = false; ctx.sound.stopSpeaking(); };
    const { unit, errors } = await loadUnit(ctx.grade, ctx.unit);
    if (!alive) return;
    const finish = () => ctx.continueLesson();
    if (!unit?.camp) {
      el.replaceChildren(h('section', { class: 'screen' }, h('h1', { class: 'display' }, 'Bu ünitede Ön Kamp yok'),
        errors?.length ? h('ul', {}, errors.map(e => h('li', {}, e))) : null,
        h('button', { class: 'go', onclick: finish }, 'Devam ', icon('caret-right'))));
      return;
    }
    const camp = unit.camp;
    const cls = ctx.store.getClass(ctx.classId);
    const level = ctx.store.classLevel(ctx.classId);

    // İletişim payı: önceki ünitelerin işlevleri + bu ünitenin işlevleri
    let cov = null;
    let source = '';
    try {
      const fnRes = await fetch('content/functions.json');
      const fn = fnRes.ok ? await fnRes.json() : { functions: [] };
      source = fn.source ?? '';
      const index = await loadIndex();
      const prevNos = (index[ctx.grade] ?? []).filter(n => n < ctx.unit);
      const prev = await Promise.all(prevNos.map(n => loadUnit(ctx.grade, n)));
      cov = coverage(fn.functions, prev.map(r => r.unit?.camp?.functions ?? []), camp.functions);
      cov.names = fn.functions.filter(f => camp.functions.includes(f.id)).map(f => f.tr);
    } catch { cov = null; }
    if (!alive) return;

    let part = 0;
    let i = 0;
    let shown = false;
    let last = 0;
    const once = () => { if (Date.now() - last < 500) return false; last = Date.now(); return true; };
    const words = camp.words.map(w => unit.vocab.find(v => v.word === w)).filter(Boolean);
    const startTs = Date.now();

    // Pasta: koyu = önceki ünitelerden, sarı = bu ünitenin ekleyeceği
    function donut() {
      const r = 70, c = 2 * Math.PI * r, NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 180 180');
      svg.setAttribute('class', 'donut');
      const ring = (cls, from = 0, pct = 100) => {
        const x = document.createElementNS(NS, 'circle');
        Object.entries({ cx: 90, cy: 90, r, class: cls, 'stroke-dasharray': `${(pct / 100) * c} ${c}`, 'stroke-dashoffset': `${-(from / 100) * c}`, transform: 'rotate(-90 90 90)' })
          .forEach(([k, v]) => x.setAttribute(k, v));
        svg.append(x);
      };
      ring('d-rest');
      if (cov.before) ring('d-before', 0, cov.before);
      ring('d-added', cov.before, cov.added);
      return h('div', { class: 'donut-wrap' }, svg, h('div', { class: 'donut-label' }, h('span', { class: 'stencil donut-pct' }, `%${cov.after}`)));
    }

    function intro() {
      return h('div', { class: 'stage camp-intro' },
        h('div', { class: 'camp-left' },
          h('p', { class: 'tape camp-mission' }, camp.mission),
          h('p', { class: 'small-label' }, 'Kariyerinde lazım olacak cümleler · dokun, dinle'),
          h('ul', { class: 'camp-examples' }, camp.examples.map(x => h('li', {},
            h('button', { class: 'camp-en', lang: 'en', onclick: () => ctx.sound.speak(x.en) }, icon('speaker-high'), ' ', x.en),
            h('span', { class: 'camp-tr' }, x.tr))))),
        cov ? h('div', { class: 'camp-right' },
          donut(),
          h('p', { class: 'camp-cov' }, `Bu üniteyi öğrenirsen İngilizce iletişim hedeflerinin yaklaşık `, h('b', {}, `%${cov.after}`), `'ini karşılamış olursun.`),
          h('p', { class: 'camp-legend' },
            cov.before ? h('span', { class: 'lg lg-before' }, `Önceki üniteler %${cov.before}`) : null,
            h('span', { class: 'lg lg-added' }, `Bu ünite +%${cov.added}`)),
          h('p', { class: 'camp-src' }, 'A2 iletişim hedeflerine göre, yaklaşık')) : null);
    }

    function wordCard() {
      const v = words[i];
      const img = h('img', { class: 'word-photo', src: `content/${v.img}`, alt: '' });
      return h('div', { class: 'stage stage-word' },
        h('div', { class: 'photo' }, img),
        h('div', { class: 'word-side' },
          h('p', { class: 'camp-ask' }, `${v.tr} → ?`),
          shown ? h('button', { class: 'word', lang: 'en', onclick: () => ctx.sound.speak(v.word) }, v.word.toLocaleUpperCase('en'))
            : h('button', { class: 'ghost', onclick: () => { shown = true; ctx.sound.speak(v.word); render(); } }, 'İngilizcesini göster')),
        h('div', { class: 'team-buttons' },
          cls.teams.map(t => h('button', { class: 'team-btn', style: { '--team': `var(--${t.color})` }, onclick: () => {
            if (!once()) return;
            award(ctx, 'team', t, 1, 'Ön Kamp');
            if (!shown) ctx.sound.speak(v.word);
            shown = true; render();
          } }, t.name)),
          h('button', { class: 'nobody', onclick: () => { shown = true; ctx.sound.speak(v.word); render(); } }, 'Kimse bilemedi')));
    }

    function checkCard() {
      const x = camp.check[i];
      const mark = ok => {
        if (!once()) return;
        ctx.store.addAttempt({ classId: ctx.classId, level, ok, activity: 'camp' });
        shown = false;
        i++;
        if (i >= camp.check.length) { part = 3; saveRate(); }
        render();
      };
      return h('div', { class: 'stage video-q' },
        h('p', { class: 'small-label' }, x.tr ?? 'Sınıf cevaplasın'),
        h('button', { class: 'question', lang: 'en', onclick: () => ctx.sound.speak(x.q) }, x.q),
        shown ? h('p', { class: 'frame' }, x.a) : h('button', { class: 'ghost small', onclick: () => { shown = true; render(); } }, 'Cevabı göster'),
        h('div', { class: 'today-actions' },
          h('button', { class: 'go', onclick: () => mark(true) }, icon('check'), ' Sınıf bildi'),
          h('button', { class: 'nobody', onclick: () => mark(false) }, icon('x'), ' Bilemedi')));
    }

    let rate = 0;
    function saveRate() {
      const tries = ctx.store.attemptsOf(ctx.classId, { since: startTs }).filter(a => a.activity === 'camp');
      rate = tries.length ? Math.round((tries.filter(a => a.ok).length / tries.length) * 100) : 0;
      ctx.store.setSetting(`campRate:${ctx.classId}:${ctx.unit}`, rate);
      ctx.store.setSetting(`campDone:${ctx.classId}:${ctx.unit}`, true);
    }

    function result() {
      return h('div', { class: 'stage playlist camp-result' },
        h('p', { class: 'playlist-title' }, 'Başlangıç: ', h('span', { class: 'camp-rate' }, `%${rate}`)),
        h('p', { class: 'hired-line' }, 'Ünitenin sonunda Boss Round\'da bu oranla karşılaştıracağız.'),
        h('button', { class: 'go wide', onclick: finish }, 'Derse devam ', icon('caret-right')));
    }

    const TITLES = ['1 · Bu ünite sana ne kazandırır?', '2 · Ne biliyoruz?', '3 · Hazırlık ölçer', 'Hazırız!'];
    function render() {
      const total = part === 1 ? words.length : part === 2 ? camp.check.length : 0;
      let body;
      let nav = null;
      if (part === 0) {
        body = intro();
        nav = h('button', { class: 'go', onclick: () => { part = 1; i = 0; shown = false; render(); } }, 'Kelimelere geç ', icon('caret-right'));
      } else if (part === 1) {
        body = wordCard();
        nav = h('button', { class: 'go', onclick: () => {
          shown = false;
          if (i < words.length - 1) i++; else { part = 2; i = 0; }
          render();
        } }, i < words.length - 1 ? 'Sonraki ' : 'Hazırlık ölçere geç ', icon('caret-right'));
      } else if (part === 2) {
        body = checkCard();
      } else {
        body = result();
      }
      el.replaceChildren(h('section', { class: 'screen coach camp' },
        h('header', { class: 'coach-head' },
          h('span', { class: 'tape lucky-name' }, `Ön Kamp · Unit ${ctx.unit} ${unit.title}`),
          h('span', { class: 'spacer' }),
          h('span', { class: 'camp-part' }, TITLES[part]),
          total ? h('span', { class: 'progress' }, `${i + 1} / ${total}`) : null,
          part < 3 ? h('button', { class: 'ghost', onclick: () => { if (part < 3) { saveRate(); part = 3; render(); toast('Ön Kamp kısaltıldı'); } } }, 'Atla') : null,
          nav), // ilerleme düğmesi başlıkta: içeriğe yer kalsın
        body));
      if (part === 3) countUp(el.querySelector('.camp-rate'), rate, { prefix: '%' });
      if (part === 0) enter([...el.querySelectorAll('.camp-examples li')], { x: -30, y: 0, stagger: 0.08 });
    }
    render();
  },
};
