// Supabase sarmalayıcı: istemci CDN'den yalnız bulut açıkken yüklenir (derleme adımı yok).
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

export async function connectCloud({ url, anonKey }) {
  const { createClient } = await import(CDN);
  const sb = createClient(url, anonKey, { auth: { persistSession: true, storageKey: 'okul.sb.auth' } });
  return {
    async session() { return (await sb.auth.getSession()).data.session; },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-posta ya da şifre hatalı.' : error.message);
    },
    async signOut() { await sb.auth.signOut(); },
    async upsert(records) {
      const rows = records.map(r => ({ id: r.id, kind: r.kind, class_id: r.class_id ?? null, key: r.key ?? null, payload: r.payload, ts: r.ts }));
      const { error } = await sb.from('records').upsert(rows, { onConflict: 'teacher_id,id' });
      if (error) throw error;
    },
    async pullSince(cursor) {
      let q = sb.from('records').select('*').order('updated_at', { ascending: true }).limit(1000);
      if (cursor) q = q.gt('updated_at', cursor);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    subscribe(onChange) {
      const ch = sb.channel('records-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, () => onChange()).subscribe();
      return () => sb.removeChannel(ch);
    },
  };
}
