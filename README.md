# YouTube Video Downloader Extension

Download any YouTube video as **MP4 (video)** veya **MP3 (audio)** — tek tıkla.

## 🚀 Kurulum

### 1. Gereksinimler
```bash
pip install flask yt-dlp flask-cors
```

### 2. Backend'i başlat (manuel)
```bash
cd server
python server.py
```
Sunucu `http://localhost:8888` portunda çalışır.

### 3. Extension'ı yükle
- `chrome://extensions` adresine git
- **Geliştirici modu** → **Paketlenmemiş öğe yükle** → proje klasörünü seç

### ⚡ Otomatik Başlatma (Opsiyonel)
Extension backend'i otomatik başlatsın istersen:
```bash
# Windows (yönetici olarak):
reg add "HKLM\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.youtube.downloader" /ve /t REG_SZ /d "%CD%\native-host\com.youtube.downloader.json" /f

# Linux/Mac:
cp native-host/com.youtube.downloader.json /etc/opt/chrome/native-messaging-hosts/
```

## 🎯 Kullanım

1. YouTube'da herhangi bir videoya gir
2. Videonun altındaki **MP3 İndir** / **MP4 İndir** butonlarına tıkla
3. Dosya otomatik iner

## 📦 Özellikler
- ✅ MP4 (video) & MP3 (ses) desteği
- ✅ YouTube ana sayfa, arama, önerilerde de çalışır
- ✅ Arka planda çalışır, gezintini engellemez
