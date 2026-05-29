#!/usr/bin/env python3
"""YouTube Downloader - Flask Backend Server with Playlist Support"""

import os
import re
import uuid
import threading
import shutil
import zipfile
import yt_dlp
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DOWNLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# In-memory progress tracking
download_progress = {}

def is_playlist_url(url):
    """Check if URL is a YouTube playlist."""
    return bool(re.search(r'(list=|&list=)', url)) or url.endswith('/playlist')

def sanitize_filename(name, max_len=80):
    """Sanitize filename, trim if too long."""
    safe = re.sub(r'[^\w\s\-\(\)\[\]]', '_', name)
    safe = re.sub(r'\s+', ' ', safe).strip()
    if len(safe) > max_len:
        safe = safe[:max_len].rstrip()
    return safe

def get_file_for_video(dir_path, video_title, ext):
    """Find downloaded file by trying various yt-dlp naming patterns."""
    # Try direct match first
    candidates = []
    for f in os.listdir(dir_path):
        if f.endswith(f'.{ext}'):
            candidates.append(f)

    if not candidates:
        return None

    # Score matches by similarity to title
    title_lower = video_title.lower()
    best = candidates[0]
    best_score = 0
    for f in candidates:
        f_noext = os.path.splitext(f)[0].lower()
        score = len(set(f_noext.split()) & set(title_lower.split()))
        if score > best_score:
            best_score = score
            best = f
    return best

@app.route('/download', methods=['POST'])
def download_video():
    """Download a single video or playlist."""
    data = request.get_json()
    url = data.get('url', '')
    fmt = data.get('format', 'mp4')

    if not url:
        return jsonify({'success': False, 'error': 'No URL provided'}), 400

    is_playlist = is_playlist_url(url)
    download_id = str(uuid.uuid4())[:8]

    try:
        # Create a temp dir for this download
        dl_dir = os.path.join(DOWNLOAD_DIR, download_id)
        os.makedirs(dl_dir, exist_ok=True)

        ydl_opts = {
            'outtmpl': os.path.join(dl_dir, '%(title)s.%(ext)s'),
            'restrictfilenames': False,
            'quiet': True,
            'no_warnings': True,
        }

        if fmt == 'mp3':
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            })
        else:
            ydl_opts.update({
                'format': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
                'merge_output_format': 'mp4',
            })

        if is_playlist:
            # Don't download the playlist index page
            ydl_opts['extract_flat'] = False
            ydl_opts['playlistrandom'] = False

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # Collect downloaded files
        files = [f for f in os.listdir(dl_dir) if os.path.isfile(os.path.join(dl_dir, f))]

        if not files:
            shutil.rmtree(dl_dir, ignore_errors=True)
            return jsonify({'success': False, 'error': 'No files were downloaded'}), 500

        if len(files) == 1 or not is_playlist:
            # Single file - serve directly
            filename = files[0]
            src = os.path.join(dl_dir, filename)
            dst = os.path.join(DOWNLOAD_DIR, filename)
            # Avoid overwrite
            if os.path.exists(dst):
                base, ext = os.path.splitext(filename)
                counter = 1
                while os.path.exists(os.path.join(DOWNLOAD_DIR, f"{base}_{counter}{ext}")):
                    counter += 1
                dst = os.path.join(DOWNLOAD_DIR, f"{base}_{counter}{ext}")
            shutil.move(src, dst)
            shutil.rmtree(dl_dir, ignore_errors=True)

            return jsonify({
                'success': True,
                'filename': os.path.basename(dst),
                'title': os.path.splitext(os.path.basename(dst))[0],
                'download_id': download_id,
                'is_playlist': False,
                'file_count': 1
            })
        else:
            # Multiple files - zip them
            playlist_name = os.path.commonprefix([os.path.splitext(f)[0] for f in files])
            playlist_name = sanitize_filename(playlist_name.strip(' _-'))

            if not playlist_name:
                playlist_name = f"playlist_{download_id}"

            zip_filename = f"{playlist_name}.zip"
            zip_path = os.path.join(DOWNLOAD_DIR, zip_filename)
            if os.path.exists(zip_path):
                os.remove(zip_path)

            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for f in files:
                    file_path = os.path.join(dl_dir, f)
                    zf.write(file_path, f)

            # Cleanup
            shutil.rmtree(dl_dir, ignore_errors=True)

            return jsonify({
                'success': True,
                'filename': zip_filename,
                'title': playlist_name,
                'download_id': download_id,
                'is_playlist': True,
                'file_count': len(files)
            })

    except Exception as e:
        # Clean up temp dir on error
        if os.path.exists(dl_dir):
            shutil.rmtree(dl_dir, ignore_errors=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/download/<filename>')
def serve_file(filename):
    """Serve the downloaded file for Chrome to download."""
    filepath = os.path.join(DOWNLOAD_DIR, filename)
    if not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404
    return send_file(filepath, as_attachment=True)


@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    print("🚀 YouTube Downloader Server starting on http://localhost:5000")
    print("📁 Downloads saved to:", DOWNLOAD_DIR)
    print("📋 Playlist support enabled!")
    app.run(host='0.0.0.0', port=5000, debug=False)
