// src/ui.js (content script)
let isLoading = false;

const setLoading = state => {
  isLoading = state;
  const btn = document.getElementById('summary-btn');
  if (!btn) return;
  btn.disabled = state;
  btn.textContent = state ? 'Loading...' : 'Summary';
};

const pauseVideo = () => {
  const video = document.querySelector('video');
  if (video && !video.paused) video.pause();
};

const getTimeSaved = () => {
  const video = document.querySelector('video');
  if (!video) return null;
  const saved = Math.max(0, Math.floor(video.duration - video.currentTime));
  if (!saved || isNaN(saved)) return null;
  const h = Math.floor(saved / 3600);
  const m = Math.floor((saved % 3600) / 60);
  const s = saved % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const injectUI = () => {

  const ext = document.createElement('div');
  ext.id = 'extension-container';
  ext.innerHTML = `
    <div id="header-container">
      <img src="${chrome.runtime.getURL('src/assets/ext-icon.png')}" class="extension-icon">
      <p class="extension-title">dontwastemytime</p>
    </div>
    <div id="button-container">
      <button id="stopwastingmytime-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="margin-right:6px;flex-shrink:0"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>
        stopwastingmytime
      </button>
      <button id="summary-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Summary
      </button>
      <button id="transcription-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
        Transcription
      </button>
      <button id="copy-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy
      </button>
      <button id="download-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download
      </button>
    </div>
    <div id="time-saved-msg"></div>
    <div id="summary-container"></div>
  `;
  setTimeout(() => {
    const sec = document.getElementById('secondary');
    const inner = document.getElementById('secondary-inner');
    if (sec && inner && sec.contains(inner)) sec.insertBefore(ext, inner);
    else document.body.appendChild(ext);
  }, 9000);

  document.body.addEventListener('click', e => {
    if (e.target.id === 'stopwastingmytime-btn') handleStopWastingMyTime();
    if (e.target.id === 'summary-btn') handleSummary();
    if (e.target.id === 'transcription-btn') handleTranscription();
    if (e.target.id === 'copy-btn') handleCopy();
    if (e.target.id === 'download-btn') handleDownload();
  });

  chrome.runtime.onMessage.addListener(msg => {
    if (msg.action === 'loadSummary') {
      displaySummary(msg.summary);
      setLoading(false);
    }
  });
};

const expand = () => {
  const btn = document.querySelector('tp-yt-paper-button#expand');
  if (btn) btn.click();
};

const clickTrans = () => {
  const btn = document.querySelector('.yt-spec-button-shape-next--call-to-action');
  if (btn) btn.click();
};

const getText = () => {
  const segs = document.querySelectorAll('ytd-transcript-segment-renderer .segment-text');
  return Array.from(segs).map(s => s.innerText).join(' ');
};

const displaySummary = txt => {
  const c = document.getElementById('summary-container');
  c.innerHTML = '';
  txt.split('\n').forEach(p => {
    const el = document.createElement('p');
    el.textContent = p;
    c.appendChild(el);
  });
};

const handleSummary = () => {
  setLoading(true);
  expand();
  setTimeout(() => {
    clickTrans();
    setTimeout(() => {
      const txt = getText();
      chrome.runtime.sendMessage({ action: 'fetchSummary', prompt: txt });
    }, 3000);
  }, 3000);
};

const handleTranscription = () => {
  expand();
  clickTrans();
  setTimeout(() => {
    displaySummary(getText());
  }, 4000);
};

const handleCopy = () => {
  const txt = document.getElementById('summary-container').innerText;
  navigator.clipboard.writeText(txt);
};

const handleDownload = () => {
  const txt = getText();
  const blob = new Blob([txt], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${document.title}.txt`;
  a.click();
};

const sendChatMessage = (delay = 1000) => {
  const sendMessage = (attempts = 0) => {
    const textarea = document.querySelector('yt-chat-input-view-model textarea');
    if (textarea) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(textarea, 'O vídeo fala sobre qual assunto? Após responder isso em uma linha, resuma em até 5 bullet points curtos o que realmente importa neste vídeo. Sem introdução, sem enrolação.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }, 500);
    } else if (attempts < 20) {
      setTimeout(() => sendMessage(attempts + 1), 500);
    }
  };
  setTimeout(() => sendMessage(), delay);
};

const clickAskItem = () => {
  // Step 2: click the "Ask" menu item (identified by the star SVG path)
  const menuItems = document.querySelectorAll('tp-yt-paper-item');
  const askItem = Array.from(menuItems).find(el => {
    const path = el.querySelector('path');
    return path && path.getAttribute('d') && path.getAttribute('d').includes('M480-80q0-83');
  });
  if (askItem) askItem.click();
  sendChatMessage(1000);
};

const showTimeSavedMsg = () => {
  const saved = getTimeSaved();
  const el = document.getElementById('time-saved-msg');
  if (!el) return;
  if (saved) {
    el.textContent = `nice, you saved ${saved} `;
  } else {
    el.textContent = '';
  }
};

const handleStopWastingMyTime = () => {
  pauseVideo();
  showTimeSavedMsg();
  // Try the direct "Perguntar" button visible in full desktop view
  const perguntarBtn = document.querySelector('button[aria-label="Perguntar"]');
  if (perguntarBtn) {
    perguntarBtn.click();
    sendChatMessage(1000);
  } else {
    // Compact/mobile view: button is behind a menu item (tp-yt-paper-item)
    clickAskItem();
  }
};

injectUI();
