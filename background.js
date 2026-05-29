// YouTube Video Downloader Extension - Background Script
// Backend'i otomatik başlatır ve yönetir

const SERVER_URL = 'http://localhost:8888';
const SERVER_PORT = 8888;

// Check if server is responding
async function isServerRunning() {
  try {
    const res = await fetch(`${SERVER_URL}/ping`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Launch Python server via native messaging host
function launchServer() {
  return new Promise((resolve, reject) => {
    try {
      // Use native messaging to talk to our host
      const host = chrome.runtime.connectNative('com.youtube.downloader');
      
      host.onMessage.addListener((msg) => {
        console.log('[YT Downloader] Native host:', msg);
        if (msg.status === 'started') {
          resolve(true);
        }
      });
      
      host.onDisconnect.addListener(() => {
        const err = chrome.runtime.lastError;
        if (err) console.warn('[YT Downloader] Native host disconnected:', err);
        resolve(false);
      });
      
      // Send start command
      host.postMessage({ action: 'start', port: SERVER_PORT });
      
      // Timeout fallback
      setTimeout(() => resolve(false), 3000);
    } catch (e) {
      console.warn('[YT Downloader] Native messaging unavailable:', e);
      resolve(false);
    }
  });
}

// Fallback: try spawning via fetch to a local endpoint
async function tryLocalSpawn() {
  try {
    const res = await fetch(`${SERVER_URL}/start`, { 
      method: 'POST',
      signal: AbortSignal.timeout(2000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Main startup flow
async function startServer() {
  console.log('[YT Downloader] Checking backend server...');
  
  // 1. Check if already running
  if (await isServerRunning()) {
    console.log('[YT Downloader] Server already running');
    return;
  }
  
  console.log('[YT Downloader] Starting backend server...');
  
  // 2. Try native messaging first
  const nativeResult = await launchServer();
  if (nativeResult || await isServerRunning()) {
    console.log('[YT Downloader] Server started via native host');
    return;
  }
  
  // 3. Wait a moment and check again
  await new Promise(r => setTimeout(r, 2000));
  if (await isServerRunning()) return;
  
  // 4. Show notification with instructions
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'YouTube Downloader',
    message: 'Backend başlatılamadı. Terminal açıp şunu çalıştırın: python server/server.py',
    priority: 2,
    buttons: [{ title: 'Kurulum talimatları' }]
  });
}

// Notification click handler
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.tabs.create({ url: 'https://github.com/haydarkadioglu/youtube-downloader-extension#kurulum' });
  }
});

// Auto-start on install/update/startup
chrome.runtime.onInstalled.addListener(() => startServer());
chrome.runtime.onStartup.addListener(() => startServer());

// Also try every 30s in case user starts watching later
setInterval(async () => {
  if (await isServerRunning()) return;
  console.log('[YT Downloader] Retrying server start...');
  startServer();
}, 30000);

// Handle download requests from content_script.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    fetch(`${SERVER_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: request.url, format: request.format || 'mp4' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.filename) {
        chrome.downloads.download({
          url: `${SERVER_URL}/downloads/${data.filename}`,
          filename: data.filename,
          saveAs: false
        });
        sendResponse({ success: true, filename: data.filename });
      } else {
        sendResponse({ success: false, error: data.error || 'Bilinmeyen hata' });
      }
    })
    .catch(() => {
      sendResponse({ success: false, error: 'Backend çalışmıyor. Lütfen python server/server.py komutunu çalıştırın.' });
    });
    
    return true; // Keep channel open
  }
});
