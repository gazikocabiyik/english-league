import { h, icon, toast } from '../../core/dom.js';

// Ayarlar → Bulut: 5 tahta tek lig. Bağlantı bilgisi, öğretmen girişi, eşitleme durumu.
export default {
  async mount(el, ctx) {
    const c = ctx.cloud;
    const conf = ctx.cloudConfig();
    const ago = ts => {
      if (!ts) return 'henüz eşitlenmedi';
      const m = Math.round((Date.now() - ts) / 60000);
      return m < 1 ? 'az önce' : `${m} dk önce`;
    };
    const back = h('button', { class: 'ghost', onclick: () => ctx.go(ctx.classId ? '#/setup' : '#/') }, ctx.classId ? 'Takımlar ve ayarlara dön' : 'Sınıf seçimine dön');
    let body;

    if (!conf?.url) {
      const url = h('input', { placeholder: 'https://xxxx.supabase.co', 'aria-label': 'Project URL' });
      const key = h('input', { placeholder: 'anon public anahtarı (eyJ…)', 'aria-label': 'anon public key' });
      body = [
        h('p', { class: 'hint' }, 'Supabase → Project Settings → API bölümündeki Project URL ve anon public anahtarını gir. service_role anahtarını girme.'),
        url, key,
        h('button', { class: 'go wide', onclick: () => {
          if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url.value.trim()) || key.value.trim().length < 40) { toast('Adres ya da anahtar eksik görünüyor'); return; }
          ctx.saveCloudConfig({ url: url.value.trim().replace(/\/$/, ''), anonKey: key.value.trim() });
          ctx.rerender();
        } }, 'Kaydet'),
      ];
    } else if (c.status !== 'on') {
      const email = h('input', { type: 'email', placeholder: 'e-posta', autocomplete: 'username' });
      const pass = h('input', { type: 'password', placeholder: 'şifre', autocomplete: 'current-password' });
      const login = async () => {
        try {
          const client = c.client ?? (await ctx.startCloud(), ctx.cloud.client);
          if (!client) { toast('Buluta bağlanılamadı (internet?)'); return; }
          await client.signIn(email.value.trim(), pass.value);
          await ctx.startCloud();
          toast('Giriş yapıldı; eşitleniyor');
          ctx.rerender();
        } catch (e) { toast(e.message); }
      };
      pass.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
      body = [
        h('p', { class: 'hint' }, c.status === 'offline' ? 'Buluta şu an ulaşılamıyor; tahta yerel olarak çalışmaya devam ediyor.' : 'Supabase\'te oluşturduğun öğretmen hesabıyla giriş yap. Tahta oturumu hatırlar.'),
        email, pass,
        h('button', { class: 'go wide', onclick: login }, icon('check'), ' Giriş yap'),
        conf.fromCode ? null : h('button', { class: 'ghost', onclick: () => { ctx.saveCloudConfig(null); ctx.rerender(); } }, 'Bağlantı bilgisini değiştir'),
      ];
    } else {
      const s = c.sync;
      const line = s.status === 'offline' ? 'Çevrimdışı: kayıtlar tahtada bekliyor' : s.pending ? `Bekleyen ${s.pending} kayıt` : `Eşitlendi · ${ago(s.lastSync)}`;
      body = [
        h('p', { class: 'tape callout' }, line),
        h('p', { class: 'hint' }, 'Bu tahtada verilen puanlar, kadrolar, seviyeler ve ders ilerlemesi diğer tahtalarla paylaşılır. İnternet kesilirse tahta çalışmaya devam eder; bağlantı gelince eşitler.'),
        h('div', { class: 'today-actions' },
          h('button', { class: 'go', onclick: async () => { await s.flush(); await s.pull(); document.dispatchEvent(new CustomEvent('scores-changed')); toast('Eşitlendi'); ctx.rerender(); } }, icon('arrow-counter-clockwise'), ' Şimdi eşitle'),
          h('button', { class: 'ghost', onclick: async () => { await c.client.signOut(); location.reload(); } }, 'Çıkış yap')),
      ];
    }
    el.append(h('section', { class: 'screen setup one' }, h('h1', { class: 'display' }, 'Bulut · 5 tahta tek lig'), ...body, back));
  },
};
