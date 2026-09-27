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
- Yeni oyun: `app/modules/<oyun>/index.js` dosyasını `{ id, title, mount, unmount }` biçiminde yaz, sonra `app/modules/registry.js`'e ekle.
- Puanlar tahtanın tarayıcısında durur. Her hafta Takımlar → **Yedeği indir**.
- Tasarım: `PRODUCT.md`, `DESIGN.md`. Görsel kaynakları: `app/content/media/CREDITS.md`.
