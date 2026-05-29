# YouTube Video Downloader Extension

Download any YouTube video as **MP4 (video)** or **MP3 (audio)** directly from the browser.

## 🚀 Kurulum

1. **Backend'i başlatın:**
   ```bash
   cd server
   pip install -r requirements.txt
   python server.py
   ```
   Sunucu `http://localhost:8888` adresinde çalışır.

2. **Chrome/Edge'de yükleyin:**
   - `chrome://extensions` adresine gidin
   - Sağ üstten **Geliştirici modu**nu açın
   - **Paketlenmemiş öğe yükle** → proje klasörünü seçin

## 🎯 Kullanım

1. YouTube'da herhangi bir video sayfasına gidin
2. Videonun altında çıkan **"MP3 İndir"** veya **"MP4 İndir"** butonlarına tıklayın
3. İndirme otomatik başlar

## ⚙️ Özellikler

- **MP4** - Video olarak indir (en yüksek kalite)
- **MP3** - Sadece ses olarak indir
- YouTube ana sayfası, arama sonuçları ve öneri kartlarında da çalışır
- Arka planda çalışır, gezinmenizi engellemez
