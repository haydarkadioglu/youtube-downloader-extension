// YouTube Downloader Popup - Pure JS Version

document.addEventListener('DOMContentLoaded', function() {
  const downloadBtn = document.getElementById('download-btn');
  const status = document.getElementById('status');
  const videoInfo = document.getElementById('video-info');
  const videoTitle = document.getElementById('video-title');
  
  // Get current YouTube tab URL
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }
  
  // Show status update
  function setStatus(msg, isError = false) {
    status.textContent = msg;
    status.className = 'status' + (isError ? ' error' : ' success');
    downloadBtn.disabled = false;
    downloadBtn.textContent = '⬇️ Download';
  }
  
  // Auto-detect video info on popup open
  (async function() {
    try {
      const tab = await getCurrentTab();
      if (tab.url && tab.url.includes('youtube.com/watch')) {
        videoInfo.style.display = 'block';
        videoTitle.textContent = '🔍 Detecting video...';
        
        chrome.runtime.sendMessage(
          { action: 'get_info', url: tab.url },
          (response) => {
            if (response && response.success) {
              videoTitle.textContent = sanitize(response.title || 'Unknown video');
            } else {
              videoTitle.textContent = '⚠️ ' + (response?.error || 'Could not detect');
            }
          }
        );
      } else {
        videoInfo.style.display = 'block';
        videoTitle.textContent = '⚠️ Go to a YouTube video page';
        downloadBtn.disabled = true;
      }
    } catch(e) {
      console.log('Popup init error:', e);
    }
  })();
  
  function sanitize(text) {
    const el = document.createElement('div');
    el.textContent = text;
    return el.innerHTML;
  }
  
  // Download handler
  downloadBtn.addEventListener('click', async function() {
    const format = document.querySelector('input[name="format"]:checked').value;
    const btn = downloadBtn;
    
    try {
      const tab = await getCurrentTab();
      
      btn.disabled = true;
      btn.textContent = '⏳ Fetching video...';
      setStatus('Fetching video data...');
      
      // Send download request to background
      chrome.runtime.sendMessage(
        { action: 'download', url: tab.url, format },
        function(response) {
          if (response && response.success) {
            setStatus(`✅ Download started!`);
            
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'YouTube Downloader',
              message: `Download started successfully!`,
              priority: 2
            });
          } else {
            setStatus(`❌ Error: ${response?.error || 'Download failed'}`, true);
          }
        }
      );
    } catch (e) {
      setStatus(`❌ ${e.message}`, true);
    }
  });
});
