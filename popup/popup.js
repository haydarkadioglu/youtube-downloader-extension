// YouTube Downloader - Popup Script with Playlist Support

document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-btn');
  const statusEl = document.getElementById('status');
  const videoInfo = document.getElementById('video-info');
  const videoTitle = document.getElementById('video-title');
  const playlistBadge = document.getElementById('playlist-badge');

  // Get current YouTube tab URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (tab && tab.url) {
      const isYoutube = tab.url.includes('youtube.com/watch') ||
                        tab.url.includes('youtu.be/') ||
                        tab.url.includes('youtube.com/playlist');
      const isPlaylist = tab.url.includes('list=') || tab.url.includes('/playlist');

      if (isYoutube) {
        videoInfo.style.display = 'block';
        const title = tab.title?.replace(' - YouTube', '').replace(' - YouTube Music', '') || 'YouTube Video';
        videoTitle.textContent = title;

        if (isPlaylist) {
          playlistBadge.style.display = 'inline-block';
          downloadBtn.textContent = '📋 Download Playlist';
        } else {
          playlistBadge.style.display = 'none';
          downloadBtn.textContent = '⬇️ Download';
        }
      } else {
        statusEl.textContent = '⚠️ Please open a YouTube video or playlist first';
        statusEl.className = 'status error';
        downloadBtn.disabled = true;
      }
    }
  });

  downloadBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab || !tab.url) {
        showStatus('No URL found', 'error');
        return;
      }

      const format = document.querySelector('input[name="format"]:checked').value;
      const isPlaylist = tab.url.includes('list=') || tab.url.includes('/playlist');

      showStatus('⏳ Downloading' + (isPlaylist ? ' playlist...' : '...'), 'loading');
      downloadBtn.disabled = true;

      chrome.runtime.sendMessage({
        action: 'download',
        url: tab.url,
        format: format
      }, (response) => {
        downloadBtn.disabled = false;
        if (response && response.success) {
          if (response.is_playlist) {
            showStatus(`✅ Playlist (${response.file_count} files) downloading: ${response.filename}`, 'success');
          } else {
            showStatus('✅ Download started: ' + response.filename, 'success');
          }
        } else {
          showStatus('❌ Error: ' + (response?.error || 'Backend not running? Start server.py'), 'error');
        }
      });
    });
  });

  function showStatus(msg, type) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + type;
  }
});
