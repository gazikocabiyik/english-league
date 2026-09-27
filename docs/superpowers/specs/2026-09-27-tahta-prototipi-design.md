# Faz 3: Tahta Prototipi (Tasarım)

Tarih: 2026-09-27 · Durum: onay bekliyor

## 1. Amaç ve başarı ölçütü
Öğretmen tahtada 1 dakikadan kısa sürede şunları yapabilmeli: sınıfı seçer, zamanlayıcıyı çalıştırır, Coach Says oynatır ve puanlar lige işlenir. Hiçbir kurulum gerekmez.
- Öğrenciler: 11. ve 12. sınıf, spor lisesi. Seviye çoğunlukla **A1–A2**, çok azı B1 ve üstü.
- Amaç: konuşma direncini kırmak ve kitabın hedef kelimelerini oyun içinde edindirmek. Gramer örtük olarak cümle kalıplarıyla verilir (bkz. `docs/mufredat.md`).
- Kapsam dışı (Faz 5): evden katılım, öğrenci girişi, sunucu.

## 2. Kısıtlar
- Windows akıllı tahta, dokunmatik, internet var. Öğretmen yönetir, klavye sadece ilk kurulumda gerekir.
- 5 sınıf: 11-A, 11-B, 11-C, 12-A, 12-B. Her sınıfın ligi ayrıdır.
- Kurulum ve derleme yok. Uygulama düz HTML, CSS ve ES modülleriyle yazılır. Yayın: GitHub Pages veya Netlify (statik).
- Düşük maliyet: ücretli servis veya API kullanılmaz. Sesli okuma için tarayıcının kendi özelliği (Web Speech API, `en-US`) kullanılır.

## 3. Ekranlar ve akış
```
Sınıf seç → Ders Paneli ─┬─ Lig Tablosu
                         ├─ Zamanlayıcı (tüm ekranlarda köşede)
                         └─ Coach Says: Tur 1 Hareket → Tur 2 Konuşma → Çıkış bileti
```
- **Sınıf seçimi:** 5 büyük düğme. Son seçilen sınıf hatırlanır.
- **Ders Paneli:** ünite seçici (1–10, sadece içeriği olan üniteler açıktır), takım listesi ve oyunlara geçiş.
- **Takımlar ve öğrenciler:** sınıf başına 2–4 takım, adı ve rengi öğretmence belirlenir. Öğrenci isim listesi bir kez girilir. Her öğrencinin bir takımı olur.
- **Puan verme:** takım veya öğrenci kartına dokunulunca +1, +3 veya −1 seçilir. "Geri al" son işlemi iptal eder ve birden fazla adım geri gidebilir.
- **Lig Tablosu:** takım ligi ve bireysel lig iki ayrı sekmededir, toplam puana göre sıralanır. Haftalık filtre "bu hafta / tüm zamanlar" seçenekleriyle çalışır.
- **Zamanlayıcı:** hazır süreler 30 sn, 1 dk, 3 dk ve 5 dk. Başlat, duraklat ve sıfırla düğmeleri var. Süre bitince düdük sesi çalar ve ekran yanıp söner. Zamanlayıcı küçültülüp köşeye alınabilir.
- **Coach Says**
  - *Tur 1 (Hareket, puansız ısınma):* büyük komut, ikon ve sesli okuma. "Coach says" ile başlayan ve başlamayan tuzak komutlar karışık gelir, tuzak oranı yaklaşık %30'dur. Öğretmen "sonraki" düğmesine basar. Komutlar ünite dosyasındaki `commands` listesinden gelir; bu listede ünite kelimeleri geçer (örn. *"Coach says: run like a police officer!"*).
  - *Tur 2 (Konuşma yarışı):* ekranda fotoğraf, kelime ve cümle kalıbı gösterilir (örn. *I'm going to be a ___*). Öğretmen doğru cümleyi ilk söyleyen takıma dokunur, takım +1 alır. Kelimeye dokunulunca sesli okunur. Türkçe anlam isteğe bağlı olarak açılıp kapanır.
  - *Çıkış bileti:* o günün kelimeleri tek tek gösterilir. Kelimeyle cümle kuran öğrencinin adına dokunulur, öğrenci bireysel +1 alır.
  - **Tekrar kuralı:** Tur 2'de seçilen her kelime oturum boyunca en az 3 kez karşıya çıkar. Sırası karıştırılır, aynı kelime art arda gelmez.

## 4. Tasarım kuralları ("yapay zekâ işi gibi görünmesin")
- Tasarım dili kodlamadan önce `/impeccable init` ile belirlenir, sonuç `PRODUCT.md` ve `DESIGN.md` dosyalarıdır. Renk, yazı tipi ve boşluk değerleri `styles/tokens.css` dosyasına aktarılır.
- Hava: skorbord ve stadyum. Güçlü, yoğun başlık yazı tipi (spor yayını tarzı), az sayıda cesur renk ve yüksek kontrast. Tahtaya 5 metreden okunabilir olmalı: gövde metni en az 32px, oyun kelimesi en az 96px.
- **Yasaklar:** mor-mavi gradyan, cam efekti (glassmorphism), emoji, birbirinin aynısı kart ızgaraları, gereksiz gölge ve süs animasyonu.
- **Görseller:** yapay zekâyla üretilmiş görsel kullanılmaz. Kelime görselleri Pexels, Unsplash veya Wikimedia'dan lisansı serbest gerçek fotoğraflardır. Fotoğraflar `content/media/` klasörüne indirilir ve kaynakları `content/media/CREDITS.md` dosyasına yazılır. Öğretmenin kendi fotoğrafları da eklenebilir.
- **İkonlar:** tek set kullanılır (Phosphor), SVG olarak projeye kopyalanır.
- **Kontrol:** her ekran bittiğinde `/impeccable critique` ve `/impeccable audit` çalıştırılır, bulunan sorunlar düzeltilir.

## 5. Kod yapısı
```
app/
  index.html            giriş, tam ekran düğmesi
  core/store.js         tüm veri okuma ve yazma işlemleri (tek kapı)
  core/router.js        hash tabanlı ekran geçişi (#/class, #/panel, #/league, #/game/coach-says)
  core/sound.js         düdük sesi ve sesli okuma
  core/content.js       ünite JSON dosyasını yükler ve doğrular
  modules/league/       lig ekranı ve puanlama
  modules/timer/        zamanlayıcı bileşeni
  modules/coach-says/   Tur 1, Tur 2, çıkış bileti
  modules/registry.js   oyun listesi; yeni oyun = yeni klasör + 1 satır
  content/11/unit1.json, content/12/unit1.json, content/media/
  styles/tokens.css, styles/base.css
tests/                  tarayıcıda açılan test sayfası (tests/index.html), bağımlılık yok
```
- Modüller birbirini doğrudan çağırmaz. Veri `store.js` üzerinden, ekran geçişleri `router.js` üzerinden yapılır.
- Her oyun modülü aynı arayüzü dışa açar: `{ id, title, mount(el, ctx), unmount() }`. `ctx` içinde sınıf, ünite, store ve sound bulunur.

## 6. Veri
**Ünite dosyası** (`content/<sınıf>/unit<n>.json`):
```json
{
  "grade": 11, "unit": 1, "title": "Future Jobs",
  "frames": ["I'm going to be a ___.", "I want to work as a ___."],
  "vocab": [
    { "word": "coach", "tr": "antrenör", "img": "media/coach.jpg", "frame": 0 }
  ],
  "commands": [
    { "text": "Coach says: run like a police officer!", "safe": true },
    { "text": "Jump like a firefighter!", "safe": false }
  ]
}
```
- Pilot içerik: 11/Ü1 (Future Jobs) ve 12/Ü1 (Music). Kelimeler kitabın ünite kelime listelerinden alınır, her ünitede 12–16 kelime olur.
- `content.js` dosyayı yüklerken eksik alan veya olmayan bir görsel bulursa açık bir uyarı gösterir, uygulama çökmez.

**Kalıcı veri** (`store.js`, şimdilik tarayıcıda `localStorage`, anahtar `okul.v1`):
```
classes[classId] = { teams:[{id,name,color}], students:[{id,name,teamId}] }
events[] = { id, classId, targetType:"team"|"student", targetId, points, reason, ts }
```
- Puanlar toplam değer olarak saklanmaz, `events` listesinden hesaplanır. Böylece geri alma işlemi son kaydı silmekten ibarettir ve haftalık filtre kolaylaşır.
- **Yedek:** ayarlarda "Yedeği indir" (JSON dosyası) ve "Yedeği yükle" düğmeleri var. Yükleme öncesinde onay sorulur.
- `localStorage` erişilemezse uygulama bellekte çalışır ve "Puanlar kaydedilmiyor, yedek alın" uyarısı gösterir.
- Faz 5'te yalnızca `store.js` sunucuya bağlanır. Arayüzü aynı kalır: `addEvent`, `undo`, `standings`, `getClass`, `saveClass`, `export`, `import`.

## 7. Test
- **Otomatik** (`tests/index.html`):
  - puan hesabı ve sıralama
  - geri alma
  - haftalık filtre
  - yedek alma ve yükleme sonrası verinin aynı kalması
  - kelime tekrar kuralı (her kelime en az 3 kez, art arda gelmez)
  - ünite dosyası doğrulama
- **Elle:** tarayıcıda 1920×1080 çözünürlükte tam ekran, dokunmatik benzeri tıklamalarla uçtan uca ders akışı denenir. Sesli okuma ve düdük Windows Chrome/Edge'de kontrol edilir.
- **Tasarım:** her ekran için `/impeccable critique` ve `audit` çalıştırılır.

## 8. Kapsam dışı / sonra
Evden katılım ve öğrenci girişi, sunucu, diğer oyunlar, 11 ve 12. sınıfların 2–10. üniteleri (Faz 4), öğretmen dışında birden fazla cihaz.
