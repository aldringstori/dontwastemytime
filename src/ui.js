// src/ui.js (content script)
let isLoading = false;

const setLoading = state => {
  isLoading = state;
  const btn = document.getElementById('summary-btn');
  if (!btn) return;
  btn.disabled = state;
  btn.textContent = state ? 'Loading...' : 'Summary';
};

const injectUI = () => {
  const ext = document.createElement('div');
  ext.id = 'extension-container';
  ext.innerHTML = `
    <div id="header-container">
      <img src="${chrome.runtime.getURL('src/assets/ext-icon.png')}" class="extension-icon">
      <p class="extension-title">YouTube Summarizer</p>
    </div>
    <div id="button-container">
      <button id="summary-btn">Summary</button>
      <button id="transcription-btn">Transcription</button>
      <button id="copy-btn">Copy</button>
      <button id="download-btn">Download</button>
    </div>
    <div id="summary-container"></div>
  `;
  setTimeout(() => {
    const sec = document.getElementById('secondary');
    const inner = document.getElementById('secondary-inner');
    if (sec && inner && sec.contains(inner)) sec.insertBefore(ext, inner);
    else document.body.appendChild(ext);
  }, 9000);

  document.body.addEventListener('click', e => {
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

injectUI();
