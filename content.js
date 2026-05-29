// YouTube Downloader - Content Script v2
// Injects download button on YouTube video pages

let downloadBtn = null;

function createDownloadButton() {
  if (downloadBtn) downloadBtn.remove();

  downloadBtn = document.createElement('button');
  downloadBtn.innerHTML = '⬇️ Download';
  downloadBtn.id = 'koza-download-btn';
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
    display: inline-flex;
    align-items: center;
    gap: 4px;
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
    downloadBtn.innerHTML = '⏳ Downloading...';
    downloadBtn.disabled = true;

    chrome.runtime.sendMessage({
      action: 'download',
      url: url
    }, (response) => {
      if (response && response.success) {
        downloadBtn.innerHTML = '✅ Downloaded!';
      } else {
        downloadBtn.innerHTML = '❌ Failed - Click popup';
      }
      setTimeout(() => {
        downloadBtn.innerHTML = '⬇️ Download';
        downloadBtn.disabled = false;
      }, 3000);
    });
  };

  return downloadBtn;
}

function injectButton() {
  const actionsArea = document.querySelector('#top-level-buttons-computed');
  if (actionsArea && !document.querySelector('#koza-download-btn')) {
    const btn = createDownloadButton();
    actionsArea.appendChild(btn);
  }
}

const observer = new MutationObserver(() => { injectButton(); });
observer.observe(document.body, { childList: true, subtree: true });

setTimeout(injectButton, 2000);
setTimeout(injectButton, 4000);
