#!/usr/bin/env python3
"""Native messaging host for YouTube Downloader extension.
Receives JSON messages from Chrome extension, calls yt-dlp, returns results.
"""

import json
import struct
import sys
import subprocess
import os
import tempfile
import shutil
import platform


def send_message(message):
    """Send a JSON message to Chrome via stdout."""
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


def read_message():
    """Read a JSON message from Chrome via stdin."""
    raw = sys.stdin.buffer.read(4)
    if not raw:
        return None
    length = struct.unpack('I', raw)[0]
    data = sys.stdin.buffer.read(length)
    return json.loads(data.decode('utf-8'))


def get_downloads_dir():
    """Get the user's Downloads directory."""
    system = platform.system()
    if system == 'Windows':
        return os.path.join(os.environ.get('USERPROFILE', 'C:\\'), 'Downloads')
    else:
        return os.path.join(os.environ.get('HOME', '/tmp'), 'Downloads')


def handle_get_info(request):
    """Get video metadata using yt-dlp."""
    url = request.get('url', '')
    try:
        result = subprocess.run(
            ['yt-dlp', '--dump-json', '--no-download', url],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return {'success': False, 'error': result.stderr.strip()[:300]}

        info = json.loads(result.stdout)
        return {
            'success': True,
            'data': {
                'title': info.get('title', 'Unknown'),
            }
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def handle_download(request):
    """Download video/audio using yt-dlp to Downloads folder."""
    url = request.get('url', '')
    format_type = request.get('format', 'mp4')
    quality = request.get('quality', '')

    downloads_dir = get_downloads_dir()
    os.makedirs(downloads_dir, exist_ok=True)

    if format_type == 'mp3':
        cmd = [
            'yt-dlp',
            '-x', '--audio-format', 'mp3',
            '--audio-quality', '0',
            '-o', os.path.join(downloads_dir, '%(title)s.%(ext)s'),
            url
        ]
    else:
        cmd = [
            'yt-dlp',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '-o', os.path.join(downloads_dir, '%(title)s.%(ext)s'),
            url
        ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes
        )

        if result.returncode != 0:
            return {'success': False, 'error': result.stderr.strip()[:500]}

        # Try to extract filename from yt-dlp output
        title = 'video'
        for line in result.stdout.split('\n'):
            if '[download]' in line and 'Destination:' in line:
                title = line.split('Destination:', 1)[1].strip()
                break
            if '[ExtractAudio]' in line and 'Destination:' in line:
                title = line.split('Destination:', 1)[1].strip()
                break

        return {
            'success': True,
            'data': {
                'filename': title,
                'path': downloads_dir
            }
        }
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Download timed out (300s)'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def main():
    while True:
        request = read_message()
        if request is None:
            break

        action = request.get('action', '')
        request_id = request.get('id')

        if action == 'get_info':
            response = handle_get_info(request)
        elif action == 'download':
            response = handle_download(request)
        else:
            response = {'success': False, 'error': f'Unknown action: {action}'}

        response['id'] = request_id
        send_message(response)


if __name__ == '__main__':
    main()
