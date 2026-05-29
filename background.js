// YouTube Downloader - Background Service Worker with Playlist Support

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    // Forward to Flask backend
    fetch('http://localhost:5000/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: message.url,
        format: message.format || 'mp4'
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Server error: ' + res.status);
      return res.json();
    })
    .then(data => {
      if (data.success && data.filename) {
        // Trigger Chrome download
        chrome.downloads.download({
          url: 'http://localhost:5000/download/' + data.filename,
          filename: data.filename,
          saveAs: true
        });
        sendResponse({
          success: true,
          filename: data.filename,
          is_playlist: data.is_playlist || false,
          file_count: data.file_count || 1
        });
      } else {
        sendResponse({ success: false, error: data.error || 'Unknown error' });
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: err.message });
    });

    return true; // Keep channel open for async response
  }
});
