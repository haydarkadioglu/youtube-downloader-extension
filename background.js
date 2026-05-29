// YouTube Video Downloader Extension - Background Script
// Backend'i otomatik başlatır ve yönetir

const SERVER_PORT = 5000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

// Check if server is responding
async function isServerRunning() {
  try {
    const res = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// Launch Python server via native messaging host
function launchServer() {
  return new Promise((resolve) => {
    try {
      const host = chrome.runtime.connectNative('com.youtube.downloader');
      
      host.onMessage.addListener((msg) => {
        console.log('[YT Downloader] Native host:', msg);
        if (msg.status === 'started' || msg.status === 'ok') {
          resolve(true);
        }
      });
      
      host.onDisconnect.addListener(() => {
        resolve(false);
      });
      
      host.postMessage({ action: 'start', port: SERVER_PORT });
      
      setTimeout(() => resolve(false), 3000);
    } catch (e) {
      console.warn('[YT Downloader] Native messaging unavailable:', e);
      resolve(false);
    }
  });
}

// Main startup flow
async function startServer() {
  console.log('[YT Downloader] Checking backend server...');
  
  // 1. Check if already running
  if (await isServerRunning()) {
    console.log('[YT Downloader] Server already running on port 5000');
    return;
  }
  
  console.log('[YT Downloader] Starting backend server...');
  
  // 2. Try native messaging
  await launchServer();
  
  // 3. Wait and check
  await new Promise(r => setTimeout(r, 2000));
  if (await isServerRunning()) {
    console.log('[YT Downloader] Server started successfully');
    return;
  }
  
  // 4. One more try after a bit
  await new Promise(r => setTimeout(r, 3000));
  if (await isServerRunning()) return;
  
  // 5. Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'YouTube Downloader',
    message: 'Backend başlatılamadı. Terminalde şunu çalıştırın: python server/server.py',
    priority: 2
  });
}

// Auto-start
chrome.runtime.onInstalled.addListener(() => startServer());
chrome.runtime.onStartup.addListener(() => startServer());

// Retry periodically
setInterval(async () => {
  if (await isServerRunning()) return;
  startServer();
}, 30000);

// Handle download requests
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    fetch(`${SERVER_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: request.url, format: request.format || 'mp4' })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.filename) {
        chrome.downloads.download({
          url: `${SERVER_URL}/download/${data.filename}`,
          filename: data.filename,
          saveAs: false
        });
        sendResponse({ success: true, filename: data.filename });
      } else {
        sendResponse({ success: false, error: data.error || 'Bilinmeyen hata' });
      }
    })
    .catch(() => {
      sendResponse({ success: false, error: 'Backend çalışmıyor.' });
    });
    
    return true;
  }
});
