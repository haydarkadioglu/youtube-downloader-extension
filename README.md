# YouTube Video Downloader Extension

Herhangi bir YouTube videosunu **MP4 (video)** veya **MP3 (ses)** olarak tek tıkla indir.

## 🚀 Kurulum

### 1️⃣ Tek Komutla Otomatik Kurulum
```bash
git clone https://github.com/haydarkadioglu/youtube-downloader-extension.git
cd youtube-downloader-extension
python setup.py
```
Bu komut:
- ✅ Gerekli Python paketlerini yükler (`flask`, `yt-dlp`, `flask-cors`)
- ✅ Chrome için native messaging host'u kaydeder (backend otomatik başlasın diye)
- ✅ Masaüstü kısayolu oluşturur
- ✅ Backend sunucusunu başlatır

### 2️⃣ Extension'ı Yükle
1. `chrome://extensions` adresine git
2. Sağ üstten **Geliştirici modu**'nu aç
3. **Paketlenmemiş öğe yükle** → proje klasörünü seç

### 3️⃣ Kullanmaya Başla
YouTube'da herhangi bir videoya girdiğinde videonun altında **MP3 İndir** / **MP4 İndir** butonları belirecek. Tıkla, dosyan anında insin! 🎯

---

## ⚡ Manuel Kurulum

Eğer `setup.py` çalışmazsa:

### Gereksinimler
```bash
pip install flask yt-dlp flask-cors
```

### Backend'i Başlat
```bash
cd server
python server.py
```
Sunucu `http://localhost:8888` portunda çalışır.

### Native Host Kaydı (Opsiyonel — Backend Otomatik Başlasın İstiyorsan)

#### Windows (Yönetici olarak PowerShell):
```powershell
reg add "HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.youtube.downloader" /ve /t REG_SZ /d "%CD%\native-host\com.youtube.downloader.json" /f
```

#### Linux:
```bash
mkdir -p ~/.config/google-chrome/NativeMessagingHosts
cp native-host/com.youtube.downloader.json ~/.config/google-chrome/NativeMessagingHosts/
```

#### macOS:
```bash
mkdir -p ~/"Library/Application Support/Google/Chrome/NativeMessagingHosts"
cp native-host/com.youtube.downloader.json ~/"Library/Application Support/Google/Chrome/NativeMessagingHosts/"
```

---

## 🎯 Kullanım

1. **YouTube'da gezin** — ana sayfa, arama sonuçları, öneriler, videonun kendisi
2. **İndir butonuna tıkla** — her videonun altında MP3 ve MP4 butonları var
3. **Dosyan gelsin** — otomatik olarak bilgisayarına indirilir

## 📦 Özellikler

| Özellik | Açıklama |
|---------|----------|
| ✅ **MP4 İndir** | Videoyu en yüksek kalitede indir |
| ✅ **MP3 İndir** | Sadece ses olarak indir |
| ✅ **Her yerde çalışır** | Ana sayfa, arama, öneriler, video sayfası |
| ✅ **Otomatik başlatma** | Setup.py ile kurunca extension backend'i kendi açar |
| ✅ **Hızlı** | Arka planda akar, gezintini engellemez |
| ✅ **Ücretsiz** | 100% açık kaynak, reklam yok |

## 📁 Proje Yapısı
```
youtube-downloader-extension/
├── icons/              # Extension ikonları
├── server/             # Python backend (Flask + yt-dlp)
│   └── server.py       # Sunucu ana dosyası
├── native-host/        # Chrome native messaging config
├── background.js       # Extension arkaplan işlemleri
├── content_script.js   # YouTube sayfalarına enjekte edilen kod
├── manifest.json       # Extension yapılandırması
├── popup.html          # Extension popup arayüzü
├── popup.js            # Popup mantığı
├── styles.css          # Stil dosyası
├── setup.py            # ⭐ Tek tıkla kurulum sihirbazı
└── README.md           # Bu dosya
```

## 🐛 Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| ❌ Butonlar görünmüyor | YouTube sayfasını yenile (F5) |
| ❌ "Backend çalışmıyor" hatası | `python server/server.py` çalıştır |
| ❌ İndirme başlamıyor | Python ve yt-dlp'nin güncel olduğundan emin ol |
| ❌ Native host hatası | `python setup.py` ile tekrar dene |

## 💻 Geliştirme

PR'lere ve önerilere açığım! 
