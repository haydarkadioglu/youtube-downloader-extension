// YouTube Downloader Extension v2 - Pure JS, No Server Needed
// Uses free API proxies to get video URLs, then downloads directly

const API_BASE = 'https://yt-downloader-api.vercel.app';

// Detect video URL from YouTube page
async function getVideoInfo(videoUrl) {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) throw new Error('Invalid YouTube URL');
  
  // Try to get direct video URL via info API
  try {
    const res = await fetch(`${API_BASE}/api/info?url=${encodeURIComponent(videoUrl)}`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {
    console.log('[YT DL] API unavailable, using fallback...');
  }
  
  // Fallback: try youtubei endpoint
  return await getVideoInfoFromPage(videoUrl);
}

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

async function getVideoInfoFromPage(videoUrl) {
  const videoId = extractVideoId(videoUrl);
  
  // Fetch the YouTube page and extract player response
  const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  
  const html = await res.text();
  
  // Extract title
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : `video_${videoId}`;
  
  // Extract player response
  const ytInitialPlayerResponse = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
  
  if (ytInitialPlayerResponse) {
    const data = JSON.parse(ytInitialPlayerResponse[1]);
    const formats = [...(data.streamingData?.formats || []), ...(data.streamingData?.adaptiveFormats || [])];
    
    // Find best format
    const bestVideo = formats.filter(f => f.mimeType?.startsWith('video/mp4'))
      .sort((a, b) => (b.width || 0) - (a.width || 0))[0];
    
    const bestAudio = formats.filter(f => f.mimeType?.startsWith('audio/mp4'))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    
    return {
      title,
      videoId,
      formats,
      directUrl: bestVideo?.url || bestAudio?.url,
      bestVideoUrl: bestVideo?.url,
      bestAudioUrl: bestAudio?.url,
      bestVideo,
      bestAudio
    };
  }
  
  throw new Error('Could not extract video data');
}

// Download a video directly via browser's native download
async function downloadDirect(url, filename, format) {
  // For direct URLs we can use chrome.downloads.download
  const response = await fetch(url);
  const blob = await response.blob();
  
  // Create blob URL and trigger download
  const blobUrl = URL.createObjectURL(blob);
  
  // Use downloads API for the blob
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  
  return new Promise((resolve) => {
    reader.onload = function() {
      chrome.downloads.download({
        url: reader.result,
        filename: `${sanitizeFilename(filename)}.${format}`,
        saveAs: false
      }, (downloadId) => {
        URL.revokeObjectURL(blobUrl);
        resolve(downloadId);
      });
    };
  });
}

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 200);
}

// Listen for messages from content script / popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    handleDownload(request.url, request.format || 'mp4')
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  
  if (request.action === 'get_info') {
    getVideoInfo(request.url)
      .then(info => sendResponse({ success: true, ...info }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

async function handleDownload(url, format) {
  const info = await getVideoInfo(url);
  
  if (format === 'mp3') {
    // Best audio format
    const audioUrl = info.bestAudioUrl || info.formats
      .filter(f => f.mimeType?.startsWith('audio'))
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.url;
    
    if (!audioUrl) throw new Error('No audio stream found');
    
    return await downloadDirect(audioUrl, info.title || `video_${info.videoId}`, 'm4a');
  } else {
    // MP4 - best video
    const videoUrl = info.bestVideoUrl || info.directUrl;
    if (!videoUrl) throw new Error('No video stream found');
    
    return await downloadDirect(videoUrl, info.title || `video_${info.videoId}`, 'mp4');
  }
}

// Auto-cleanup
chrome.runtime.onStartup.addListener(() => {
  // Clean old blob URLs if any stored
  chrome.storage.local.remove('oldDownloads');
});
