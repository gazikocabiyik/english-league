# English League — Spor Lisesi İngilizce

Akıllı tahta için sınıf ligi, zamanlayıcı ve Coach Says oyunu. 11. ve 12. sınıflar, A1–A2.

- Tahtada aç: `<yayın adresi>/app/` → sağ üstteki tam ekran düğmesi.
- İlk açılışta: **Şube ekle** (örn. 11 + L) → şubeye dokun → **Takımlar**'dan takımları ve öğrencileri gir.
- Yerelde çalıştır: `python3 -m http.server 8000` → http://localhost:8000/app/
- Testler: `npm test` (Node) ya da http://localhost:8000/tests/
- Fotoğraf incelemesi: http://localhost:8000/tests/photos.html
- Yeni ünite: `app/content/<sınıf>/unit<n>.json` ekle, numarasını `app/content/index.json`'a yaz, sonra `python3 scripts/commons.py <dosya>` ile fotoğrafları indir. Beğenilmeyen fotoğraf için: `python3 scripts/commons.py <dosya> --only <kelime> --force --skip 1`. İstersen kendi fotoğrafını aynı yola koyup `app/content/media/CREDITS.md`'ye bir satır ekleyebilirsin.
- Yeni oyun: `app/modules/<oyun>/index.js` dosyasını `{ id, title, mount, unmount }` biçiminde yaz, sonra `app/modules/registry.js`'e ekle.
- Puanlar tahtanın tarayıcısında durur. Her hafta Takımlar → **Yedeği indir**.
- Tasarım: `PRODUCT.md`, `DESIGN.md`. Görsel kaynakları: `app/content/media/CREDITS.md`.
