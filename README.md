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

## Okul ağı engeli: çevrimdışı açılış
MEB filtresi github-pages'i engelleyebilir. Kök dizindeki `sw.js` (Service Worker), tahta siteyi internetle bir kez açınca bütün dosyaları (~22 MB) tahtanın hafızasına indirir. Sonra okul ağı engellese de uygulama tahtanın hafızasından açılır.
- Kod ya da içerik değiştiğinde yayından önce `node scripts/precache.mjs` çalıştır. Liste eskiyse `npm test` bunu yakalar.
- Tahta yeni sürümü, tarayıcı kapanıp internetle yeniden açıldığında alır.

## Tahta testleri (Playwright)
Her ekran gerçek Chrome'da iki tahta boyutunda (1280×600 ve 1920×1080) açılır. Kontrol edilenler:
- içerik dikey ya da yatay taşıyor mu;
- asıl düğmeler görünür ve ekranın içinde mi;
- konsolda hata var mı.

Ayrıca takım oylaması puanları ve internet yokken açılış da test edilir.
- Kurulum (bir kez): `npm install`. Tarayıcı indirilmez, bilgisayardaki Chrome kullanılır.
- Çalıştırma: `npm run test:e2e`. Yayından önce hepsi için: `npm run check` (birim testleri + tahta testleri).
- Başarısız testin ekran görüntüsü ve izi: `npx playwright show-report`.
- Yeni ekran eklenince `e2e/screens.spec.js`'e bir test eklenir; deneme verisi `e2e/fixtures.js` içinde.

## Veri güvenliği (güncellemelerde veri kaybolmaz)
- Veri her tahtanın tarayıcısında (`okul.v1`) durur. Güncellemeler bu veriyi silmez; yeni alanlar yalnız eklenir.
- Testler eski biçimdeki bir sınıf kaydının yeni sürümde aynen açıldığını sınar (`tests/store.test.js`, `e2e/flows.spec.js`). Biçim değişikliği gerekirse önce bu testler güncellenir.
- **Günlük otomatik yedek** (`okul.v1.gunluk`): günün ilk açılışında, hiçbir şey değişmeden önce alınır. Ayarlar · Yedek → "Otomatik yedek" ile geri dönülür.
- **Bulut** (giriş yapılmış tahtalar): bütün puanlar Supabase'te de durur. Tahtanın tarayıcı verisi silinse bile yeniden giriş yapınca hepsi geri iner.
- **Elle yedek:** Ayarlar · Yedek → "Yedeği indir" (haftada bir önerilir).
- Tanınmayan ya da bozuk kayıt silinmeden önce `okul.v1.bak` olarak saklanır.
