// YouTube Downloader - Content Script
// Adds a download button to YouTube video & playlist pages

let downloadBtn = null;

function createDownloadButton() {
  if (downloadBtn) downloadBtn.remove();

  downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '⬇️ Download';
  downloadBtn.style.cssText = `
    margin-left: 8px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #ff4444, #cc0000);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(255,0,0,0.3);
    transition: all 0.2s;
  `;
  downloadBtn.onmouseover = () => {
    downloadBtn.style.transform = 'scale(1.05)';
    downloadBtn.style.boxShadow = '0 4px 12px rgba(255,0,0,0.5)';
  };
  downloadBtn.onmouseout = () => {
    downloadBtn.style.transform = 'scale(1)';
    downloadBtn.style.boxShadow = '0 2px 8px rgba(255,0,0,0.3)';
  };

  downloadBtn.onclick = async () => {
    const url = window.location.href;
    const isPlaylist = url.includes('list=') || url.includes('/playlist');

    // Visual feedback
    downloadBtn.innerHTML = isPlaylist ? '⏳ Downloading playlist...' : '⏳ Downloading...';
    downloadBtn.disabled = true;

    chrome.runtime.sendMessage({
      action: 'download',
      url: url
    }, (response) => {
      setTimeout(() => {
        downloadBtn.innerHTML = isPlaylist ? '📋 Download Playlist' : '⬇️ Download';
        downloadBtn.disabled = false;
      }, 2000);
    });
  };

  return downloadBtn;
}

function injectButton() {
  // YouTube's action buttons area (for video pages)
  const actionsArea = document.querySelector('#top-level-buttons-computed');
  if (actionsArea && !document.querySelector('#koza-download-btn')) {
    const btn = createDownloadButton();
    btn.id = 'koza-download-btn';
    actionsArea.appendChild(btn);
  }

  // For playlist pages - try alternate selectors
  if (!document.querySelector('#koza-download-btn')) {
    const secondaryArea = document.querySelector('#owner #actions');
    if (secondaryArea && !document.querySelector('#koza-download-btn')) {
      const btn = createDownloadButton();
      btn.id = 'koza-download-btn';
      btn.style.marginTop = '8px';
      secondaryArea.appendChild(btn);
    }
  }
}

// Watch for page navigation (SPA - YouTube changes page without reload)
const observer = new MutationObserver(() => {
  injectButton();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial injection with delay for page load
setTimeout(injectButton, 2000);
setTimeout(injectButton, 4000);
