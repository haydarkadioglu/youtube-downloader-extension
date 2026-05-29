# YouTube Downloader Extension (Pure JS)

> **Sıfır bağımlılık.** Python, Node.js, ffmpeg gerekmez. Sadece Chrome/Chromium yeterli.

## 🚀 Özellikler

- ⬇️ **Tek tıkla indirme** — YouTube video sayfasında direkt "Download" butonu
- 🎬 **MP4 Video** — En iyi kalitede video indirme
- 🎵 **MP3 Audio** — Sadece ses olarak indirme
- 🔒 **Sunucu yok** — Tüm işlem tarayıcı içinde
- ⚡ **Hızlı** — Background worker ile asenkron indirme

## 📦 Kurulum

1. Chrome'da `chrome://extensions/` adresine git
2. Sağ üstten **Geliştirici Modu**'nu aç
3. **Paketlenmemiş öğe yükle**'ye tıkla
4. Bu klasörü seç

## 🎯 Kullanım

- YouTube'da herhangi bir videoya gir
- Video başlığının altındaki kırmızı **⬇️ Download** butonuna tıkla
- Veya extension ikonuna tıkla, format seç (MP4/MP3) ve indir

## ⚙️ Nasıl Çalışır?

1. Video sayfasından direkt stream URL'leri çekilir (YouTube'un kendi CDN'inden)
2. Video/audio stream'i tarayıcıya indirilir
3. Chrome'un Downloads API'si ile kaydedilir

Hiçbir harici servise video gönderilmez, her şey local'de kalır.

## 📝 Not

Yüksek çözünürlüklü videolar için YouTube'un login gerektiren stream'leri varsa, indirme başarısız olabilir. Bu durumda popup'tan farklı format dene.
