# English League — Spor Lisesi İngilizce

Akıllı tahta için sınıf ligi, zamanlayıcı ve Coach Says oyunu. 11. ve 12. sınıflar, A1–A2.

- Tahtada aç: `<yayın adresi>/app/` → sağ üstteki tam ekran düğmesi.
- İlk açılışta: **Şube ekle** (örn. 11 + L) → şubeye dokun → **Takımlar**'dan takımları ve öğrencileri gir.
- Yerelde çalıştır: `python3 -m http.server 8000` → http://localhost:8000/app/
- Testler: `npm test` (Node) ya da http://localhost:8000/tests/
- Fotoğraf incelemesi: http://localhost:8000/tests/photos.html
- Yeni ünite: `app/content/<sınıf>/unit<n>.json` ekle, numarasını `app/content/index.json`'a yaz, sonra `python3 scripts/commons.py <dosya>` ile fotoğrafları indir. Beğenilmeyen fotoğraf için: `python3 scripts/commons.py <dosya> --only <kelime> --force --skip 1`. İstersen kendi fotoğrafını aynı yola koyup `app/content/media/CREDITS.md`'ye bir satır ekleyebilirsin.
- Fotoğraf (Pexels, Apify üzerinden): `.env` içine `APIFY_TOKEN=...` yaz, sonra `python3 scripts/apify_photos.py <ünite dosyası> [--only kelime] [--force] [--skip 1]`. Sonuç başına ~0,003 $.
- Doğal sesler (Kokoro): bir kez `uv venv -p 3.12 .venv-tts` ve kurulum (ayrıntı `scripts/voices.py` başında), sonra her yeni ünitede `.venv-tts/bin/python scripts/voices.py`. Yalnız eksik sesler üretilir.
- Sarmal tekrar: bir ünitenin kelimeleri sonraki ünitede %30, ondan sonrakinde %10, daha sonrakilerde %5 oranında (yeni kelimelerin üstüne ek) Coach Says konuşma turuna "Tekrar · Ü<n>" etiketiyle karışır.
- Ünite JSON biçimi: `frames` = `{ "A1": [...], "A2": [...], "B1": [...] }` (paralel, her kalıpta tek `___`), `commands` her biri `level` alanlı (seviye başına en az 4, en az 1 tuzak), isteğe bağlı `interview` = `{ jobs, questions: { A1, A2, B1 } }` (`{job}` meslekle ve a/an ile dolar). Doğrulama `app/core/content.js`.
- Uyarlanır seviye: bkz. `docs/mufredat.md` → "Uyarlanır seviye".
- Yeni oyun: `app/modules/<oyun>/index.js` dosyasını `{ id, title, mount, unmount }` biçiminde yaz, sonra `app/modules/registry.js`'e ekle.
- Puanlar tahtanın tarayıcısında durur. Her hafta Takımlar → **Yedeği indir**.
- Tasarım: `PRODUCT.md`, `DESIGN.md`. Görsel kaynakları: `app/content/media/CREDITS.md`.

## Bulut: 5 tahta tek lig (Faz 5a)
Tahtalar önce kendi hafızasıyla çalışır; giriş yapılmış tahta her değişikliği Supabase'e gönderir ve diğer tahtaların kayıtlarını çeker.
1. Supabase'te proje aç (bölge Frankfurt) → SQL Editor'e `supabase/schema.sql` yapıştır → Run.
2. Authentication → Users → Add user (Auto Confirm) ile öğretmen hesabı aç.
3. Project Settings → API'deki **Project URL** ve **anon public** anahtarını `app/config.js`'e yaz (ya da tahtada Ayarlar → Bulut ekranına bir kez gir). **service_role anahtarı asla kullanılmaz.**
4. Her tahtada Ayarlar → Bulut → e-posta ve şifre ile bir kez giriş yap. İlk girişte o tahtadaki mevcut veri buluta yüklenir.
- Üst çubuktaki bulut: yeşil eşitlendi, sarı kayıt bekliyor, gri çevrimdışı ya da giriş yok.
- Ücretsiz proje 7 gün kullanılmazsa uyur; tahta yerel çalışmaya devam eder, panelden "Restore" ile uyandırılınca bekleyen kayıtlar gider.
