// YouTube Downloader — Native Messaging Background v3
// This is the bridge between the popup/content scripts and yt-dlp via native host

const NATIVE_HOST = 'com.koza.ytdl';
let nativePort = null;

// ===== NATIVE HOST CONNECTION =====

function connectNative() {
  try {
    nativePort = chrome.runtime.connectNative(NATIVE_HOST);
    
    nativePort.onMessage.addListener((msg) => {
      console.log('[Native] Received:', msg);
      
      // Forward to the sender
      if (pendingCallbacks[msg.id]) {
        pendingCallbacks[msg.id](msg);
        delete pendingCallbacks[msg.id];
      }
    });

    nativePort.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError;
      console.log('[Native] Disconnected:', err?.message || 'no error');
      nativePort = null;
      
      // Reject all pending
      for (const id in pendingCallbacks) {
        pendingCallbacks[id]({ id, success: false, error: 'Native host disconnected: ' + (err?.message || 'unknown') });
        delete pendingCallbacks[id];
      }
    });

    return true;
  } catch (e) {
    console.error('[Native] Connection failed:', e);
    nativePort = null;
    return false;
  }
}

function ensureNativeConnection() {
  if (nativePort) return true;
  return connectNative();
}

// ===== REQUEST/RESPONSE SYSTEM =====

let msgCounter = 0;
const pendingCallbacks = {};

function sendNative(action, data = {}, timeoutMs = 60000) {
  return new Promise((resolve) => {
    if (!ensureNativeConnection()) {
      resolve({ success: false, error: 'Cannot connect to native host. Is yt-dlp installed?' });
      return;
    }

    const id = ++msgCounter;
    const msg = { id, action, ...data };

    pendingCallbacks[id] = (response) => {
      clearTimeout(timer);
      resolve(response);
    };

    try {
      nativePort.postMessage(msg);
    } catch (e) {
      delete pendingCallbacks[id];
      resolve({ success: false, error: 'Failed to send message: ' + e.message });
      return;
    }

    const timer = setTimeout(() => {
      if (pendingCallbacks[id]) {
        delete pendingCallbacks[id];
        resolve({ success: false, error: 'Request timed out after ' + (timeoutMs/1000) + 's' });
      }
    }, timeoutMs);
  });
}

// ===== VIDEO INFO CACHE =====

let cachedVideoInfo = null;

async function fetchVideoInfo(tabId) {
  try {
    // Try to get info from content script first
    if (tabId) {
      try {
        const results = await chrome.tabs.sendMessage(tabId, { action: 'get_video_id' });
        if (results?.videoId) {
          console.log('[Background] Got videoId from content:', results.videoId);
        }
      } catch (e) {
        // content script not injected yet or not on YouTube
      }
    }

    // Get info via native host (yt-dlp will extract from page)
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.url || !isYoutubeUrl(tab.url)) {
      return { success: false, error: 'Not a YouTube video page' };
    }

    const result = await sendNative('get_info', { url: tab.url });
    
    if (result?.success && result?.data) {
      cachedVideoInfo = result.data;
    }
    
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function isYoutubeUrl(url) {
  return url && (url.includes('youtube.com/watch') || 
                 url.includes('youtu.be/') || 
                 url.includes('youtube.com/shorts/'));
}

// ===== MESSAGE HANDLER =====

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Must return true for async responses

  switch (request.action) {
    
    case 'ping':
      // Check native host health
      if (nativePort) {
        sendResponse({ success: true, connected: true });
      } else if (ensureNativeConnection()) {
        sendResponse({ success: true, connected: true });
      } else {
        sendResponse({ success: false, connected: false, error: 'Native host unavailable' });
      }
      return false;

    case 'get_info':
      (async () => {
        const tabId = sender?.tab?.id;
        const result = await fetchVideoInfo(tabId);
        
        if (result?.success && result?.data) {
          sendResponse({ 
            success: true, 
            title: result.data.title || 'Unknown',
            duration: result.data.duration,
            url: result.data.webpage_url
          });
        } else {
          // Use cached if available
          if (cachedVideoInfo) {
            sendResponse({ success: true, title: cachedVideoInfo.title });
          } else {
            sendResponse({ success: false, error: result?.error || 'Could not fetch video info' });
          }
        }
      })();
      return true;

    case 'download':
      (async () => {
        // Get the video URL from the active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        
        if (!tab?.url || !isYoutubeUrl(tab.url)) {
          sendResponse({ success: false, error: 'Not on a YouTube video page' });
          return;
        }

        const format = request.format || 'mp4';
        const quality = request.quality || (format === 'mp3' ? 'bestaudio' : 'bestvideo+bestaudio/best');

        // If mp3, auto-download to a temp directory — native host handles it
        const result = await sendNative('download', {
          url: tab.url,
          format: format,
          quality: quality,
          output_template: '%(title)s.%(ext)s'
        });

        if (result?.success) {
          sendResponse({ 
            success: true, 
            filename: result.data?.filename || result.data?.title || 'video',
            path: result.data?.path
          });
        } else {
          sendResponse({ success: false, error: result?.error || 'Download failed' });
        }
      })();
      return true;

    case 'download_url':
      // Direct URL download (from context menu or other sources)
      (async () => {
        if (!request.url || !isYoutubeUrl(request.url)) {
          sendResponse({ success: false, error: 'Invalid YouTube URL' });
          return;
        }

        const format = request.format || 'mp4';
        const result = await sendNative('download', {
          url: request.url,
          format: format,
          output_template: '%(title)s.%(ext)s'
        });

        sendResponse(result?.success 
          ? { success: true, filename: result.data?.title || 'video' }
          : { success: false, error: result?.error || 'Download failed' });
      })();
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      return false;
  }
});

// ===== CONTEXT MENU =====
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'download-video',
    title: '⬇️ Download this video',
    contexts: ['link', 'video'],
    targetUrlPatterns: ['*://*.youtube.com/*', '*://youtu.be/*']
  }, () => {
    if (chrome.runtime.lastError) {
      console.log('[ContextMenu] Error:', chrome.runtime.lastError.message);
    }
  });
  
  chrome.contextMenus.create({
    id: 'download-audio',
    title: '🎵 Download audio only',
    contexts: ['link', 'video'],
    targetUrlPatterns: ['*://*.youtube.com/*', '*://youtu.be/*']
  }, () => {
    if (chrome.runtime.lastError) {
      console.log('[ContextMenu] Error:', chrome.runtime.lastError.message);
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.srcUrl || tab?.url;
  if (!url || !isYoutubeUrl(url)) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'YouTube Downloader',
      message: 'Not a valid YouTube URL'
    });
    return;
  }

  const format = info.menuItemId === 'download-audio' ? 'mp3' : 'mp4';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'YouTube Downloader',
    message: `Starting ${format.toUpperCase()} download...`,
    priority: 2
  });

  // Trigger download
  chrome.runtime.sendMessage({
    action: 'download_url',
    url: url,
    format: format
  });
});

// ===== RECONNECT LOGIC =====
// Periodically check native host connection
setInterval(() => {
  if (!nativePort) {
    ensureNativeConnection();
  }
}, 30000); // Check every 30 seconds
