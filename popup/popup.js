// YouTube Downloader Popup v3 — Native Messaging

document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('download-btn');
  const status = document.getElementById('status');
  const videoInfo = document.getElementById('video-info');
  const videoTitle = document.getElementById('video-title');
  const nativeStatus = document.getElementById('native-status');

  let currentTab = null;

  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  function setStatus(msg, type) {
    status.textContent = msg;
    status.className = 'status';
    if (type) status.classList.add(type);
  }

  function setNativeStatus(msg, connected) {
    if (nativeStatus) {
      nativeStatus.textContent = connected ? '🟢 Native host connected' : '🔴 ' + msg;
      nativeStatus.className = 'native-status';
      nativeStatus.classList.add(connected ? 'connected' : 'disconnected');
    }
  }

  // Open setup guide link
  document.getElementById('setup-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://github.com/yt-dlp/yt-dlp' });
  });

  // Check native host connectivity
  chrome.runtime.sendMessage(
    { action: 'ping' },
    (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        setNativeStatus('Native host not found. Install yt-dlp and register the host.', false);
        downloadBtn.disabled = true;
        downloadBtn.title = 'Setup native host first';
      } else {
        setNativeStatus('', true);
      }
    }
  );

  // Auto-detect video info
  (async function() {
    try {
      currentTab = await getCurrentTab();
      const url = currentTab?.url || '';

      if (url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/')) {
        videoInfo.style.display = 'block';
        videoTitle.textContent = '🔍 Detecting...';
        
        chrome.runtime.sendMessage(
          { action: 'get_info' },
          (response) => {
            if (response?.success) {
              videoTitle.innerHTML = '🎬 ' + sanitize(response.title || 'Unknown');
            } else {
              videoTitle.innerHTML = '⚠️ ' + (response?.error || 'Could not detect');
            }
          }
        );
      } else if (url.includes('youtube.com')) {
        videoInfo.style.display = 'block';
        videoTitle.textContent = '⚠️ Open a specific video';
        downloadBtn.disabled = true;
      } else {
        videoInfo.style.display = 'block';
        videoTitle.textContent = '🌐 Go to YouTube first';
        downloadBtn.disabled = true;
      }
    } catch(e) {
      console.log('Popup init error:', e);
      videoInfo.style.display = 'block';
      videoTitle.textContent = '⚠️ Error loading popup';
    }
  })();

  function sanitize(text) {
    const el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
  }

  // Download handler
  downloadBtn.addEventListener('click', async function() {
    const format = document.querySelector('input[name="format"]:checked')?.value || 'mp4';
    
    try {
      if (!currentTab) currentTab = await getCurrentTab();
      
      downloadBtn.disabled = true;
      downloadBtn.textContent = '⏳ Downloading...';
      setStatus('Sending to native host...', 'info');

      chrome.runtime.sendMessage(
        { action: 'get_info' },
        (infoResponse) => {
          if (!infoResponse?.success) {
            setStatus('❌ ' + (infoResponse?.error || 'Failed'), 'error');
            downloadBtn.textContent = '⬇️ Download';
            downloadBtn.disabled = false;
            return;
          }

          setStatus('📥 Downloading ' + sanitize(infoResponse.title || 'video') + '...', 'info');
          
          chrome.runtime.sendMessage(
            { action: 'download', format },
            (dlResponse) => {
              if (dlResponse?.success) {
                setStatus('✅ Download started: ' + sanitize(dlResponse.filename || ''), 'success');
                downloadBtn.textContent = '✅ Done';
                
                chrome.notifications?.create({
                  type: 'basic',
                  iconUrl: '../icons/icon48.png',
                  title: 'YouTube Downloader',
                  message: `Downloading: ${infoResponse.title || 'video'}`,
                  priority: 2
                });
              } else {
                setStatus('❌ ' + (dlResponse?.error || 'Download failed'), 'error');
                downloadBtn.textContent = '⬇️ Retry';
                downloadBtn.disabled = false;
              }
            }
          );
        }
      );
    } catch (e) {
      setStatus('❌ ' + e.message, 'error');
      downloadBtn.textContent = '⬇️ Download';
      downloadBtn.disabled = false;
    }
  });

  // Refresh button handler
  document.getElementById('refresh-btn')?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'get_info' }, (response) => {
      if (response?.success) {
        videoTitle.innerHTML = '🎬 ' + sanitize(response.title || 'Unknown');
        setStatus('✅ Refreshed!', 'success');
      } else {
        videoTitle.innerHTML = '⚠️ ' + (response?.error || 'Could not detect');
      }
    });
  });
});
