#!/usr/bin/env python3
"""
YouTube Downloader - Otomatik Kurulum & Native Host Kayıt
Kullanım: python setup.py
"""
import os
import sys
import subprocess
import json
import shutil
from pathlib import Path

# Renkli çıktı
GREEN = '\033[92m'
YELLOW = '\033[93m'
RED = '\033[91m'
RESET = '\033[0m'

def log(msg, color=GREEN):
    print(f"{color}[✓]{RESET} {msg}" if color == GREEN else f"{color}[!]{RESET} {msg}")

def install_deps():
    """Gerekli Python paketlerini yükle"""
    log("Python paketleri kontrol ediliyor...", YELLOW)
    for pkg in ['flask', 'yt-dlp', 'flask-cors']:
        result = subprocess.run(
            [sys.executable, '-m', 'pip', 'show', pkg],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            log(f"{pkg} yükleniyor...", YELLOW)
            subprocess.run([sys.executable, '-m', 'pip', 'install', pkg], check=True)
            log(f"{pkg} yüklendi")
        else:
            log(f"{pkg} zaten yüklü")

def register_native_host():
    """Native messaging host'u kaydet (Chrome otomatik başlatsın diye)"""
    log("Native messaging host kaydediliyor...", YELLOW)
    
    script_dir = Path(__file__).parent.resolve()
    server_path = script_dir / 'server' / 'server.py'
    
    # server.py'yi çalıştırılabilir yap
    if sys.platform != 'win32':
        server_path.chmod(0o755)
    
    # Native host JSON
    host_config = {
        "name": "com.youtube.downloader",
        "description": "YouTube Downloader Backend - otomatik başlatma",
        "path": str(server_path),
        "type": "stdio",
        "allowed_origins": ["chrome-extension://*"]
    }
    
    host_json = json.dumps(host_config, indent=2)
    
    if sys.platform == 'win32':
        # Windows - Registry
        import winreg
        key_path = r"SOFTWARE\Google\Chrome\NativeMessagingHosts\com.youtube.downloader"
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
            winreg.SetValue(key, "", winreg.REG_SZ, str(script_dir / 'native-host' / 'com.youtube.downloader.json'))
            winreg.CloseKey(key)
            log("Windows Registry kaydı yapıldı")
        except Exception as e:
            log(f"Registry hatası: {e}", RED)
            # Alternatif: JSON dosyasının yolunu göster
            native_json_path = script_dir / 'native-host' / 'com.youtube.downloader.json'
            native_json_path.write_text(host_json)
            log(f"Manuel kayıt: regedit ile HKCU\\{key_path} yoluna '{native_json_path}' değerini ekle", YELLOW)
    elif sys.platform == 'darwin':
        # macOS
        chrome_host_dir = Path.home() / 'Library' / 'Application Support' / 'Google' / 'Chrome' / 'NativeMessagingHosts'
        chrome_host_dir.mkdir(parents=True, exist_ok=True)
        (chrome_host_dir / 'com.youtube.downloader.json').write_text(host_json)
        log("macOS native host kaydı yapıldı")
    else:
        # Linux
        chrome_host_dir = Path.home() / '.config' / 'google-chrome' / 'NativeMessagingHosts'
        chrome_host_dir.mkdir(parents=True, exist_ok=True)
        (chrome_host_dir / 'com.youtube.downloader.json').write_text(host_json)
        
        # Chromium için de ekle
        chromium_host_dir = Path.home() / '.config' / 'chromium' / 'NativeMessagingHosts'
        chromium_host_dir.mkdir(parents=True, exist_ok=True)
        (chromium_host_dir / 'com.youtube.downloader.json').write_text(host_json)
        log("Linux native host kaydı yapıldı (Chrome + Chromium)")

def create_shortcut():
    """Masaüstü kısayolu oluştur"""
    script_dir = Path(__file__).parent.resolve()
    server_script = script_dir / 'server' / 'server.py'
    
    if sys.platform == 'win32':
        # Windows .bat dosyası
        bat_path = script_dir / 'start-server.bat'
        bat_path.write_text(f'@echo off\n"{sys.executable}" "{server_script}"\npause')
        log(f"Başlatma betiği: {bat_path}")
    elif sys.platform == 'darwin':
        # macOS .command
        cmd_path = script_dir / 'start-server.command'
        cmd_path.write_text(f'#!/bin/bash\ncd "{script_dir}"\n{sys.executable} "{server_script}"\n')
        cmd_path.chmod(0o755)
        log(f"Başlatma betiği: {cmd_path}")
    else:
        # Linux .desktop
        desktop_path = Path.home() / '.local' / 'share' / 'applications' / 'yt-downloader-server.desktop'
        desktop_path.parent.mkdir(parents=True, exist_ok=True)
        desktop_path.write_text(f'''[Desktop Entry]
Type=Application
Name=YouTube Downloader Server
Comment=Arkaplan sunucusu
Exec={sys.executable} {server_script}
Terminal=false
Categories=Utility;
''')
        desktop_path.chmod(0o755)
        log(f"Linux otomatik başlatma: {desktop_path}")

def main():
    print(f"""
╔══════════════════════════════════════════╗
║   YouTube Downloader - Otomatik Kurulum   ║
╚══════════════════════════════════════════╝
""")
    
    # 1. Python paketleri
    install_deps()
    
    # 2. Native host kaydı
    register_native_host()
    
    # 3. Kısayol
    create_shortcut()
    
    # 4. Server'ı başlat
    log("Sunucu başlatılıyor...", YELLOW)
    server_script = Path(__file__).parent / 'server' / 'server.py'
    
    if sys.platform == 'win32':
        # Windows'ta yeni pencere aç
        subprocess.Popen(['start', '', sys.executable, str(server_script)], shell=True)
    else:
        # Linux/Mac arkaplanda çalıştır
        subprocess.Popen([sys.executable, str(server_script)], 
                        stdout=subprocess.DEVNULL, 
                        stderr=subprocess.DEVNULL,
                        start_new_session=True)
    
    print(f"""
{GREEN}✅ Kurulum tamamlandı!{RESET}

📌 Backend sunucusu başlatıldı: http://localhost:8888
📌 Extension'ı yüklemek için:
   1. chrome://extensions adresine git
   2. Geliştirici modu → Paketlenmemiş öğe yükle
   3. Bu klasörü seç

🔁 Extension otomatik olarak backend'i bulup kullanacak.
""")

if __name__ == '__main__':
    main()
