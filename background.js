// YouTube Video Downloader Extension - Background Script

let serverProcess = null;

// Check if Python is available and start server
async function startServer() {
  try {
    // Try to start the Python server bundled with the extension
    const serverUrl = 'http://localhost:8888';
    
    // Check if server is already running
    const check = await fetch(serverUrl + '/ping').catch(() => null);
    if (check && check.ok) {
      console.log('[YT Downloader] Server already running');
      return;
    }
  } catch(e) {
    // Server not running, we'll start it
  }

  // Try multiple methods to start the server
  const scripts = [
    { cmd: 'python3', args: ['server/server.py'] },
    { cmd: 'python', args: ['server/server.py'] }
  ];

  // Get extension path
  const extensionRoot = chrome.runtime.getURL('/');
  
  // Try using native messaging host approach - launch via fetch to local bundled server
  // For now, show a notification if server isn't running
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'YouTube Downloader',
    message: 'Backend sunucusu başlatılıyor... Python yüklü olduğundan emin olun.',
    priority: 2
  });
}

// Start server on install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[YT Downloader] Extension installed:', details.reason);
  startServer();
});

// Also try on startup
chrome.runtime.onStartup.addListener(() => {
  startServer();
});

// Handle download requests from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    const serverUrl = 'http://localhost:8888';
    
    fetch(`${serverUrl}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: request.url,
        format: request.format || 'mp4'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.filename) {
        // Download the file
        chrome.downloads.download({
          url: `${serverUrl}/downloads/${data.filename}`,
          filename: data.filename,
          saveAs: false
        });
        sendResponse({ success: true, filename: data.filename });
      } else {
        sendResponse({ success: false, error: data.error || 'Unknown error' });
      }
    })
    .catch(err => {
      sendResponse({ success: false, error: 'Backend sunucusu çalışmıyor! Önce python server/server.py komutunu çalıştırın.' });
    });

    return true; // Keep channel open for async response
  }
});
