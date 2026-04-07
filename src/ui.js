// src/ui.js — content script

const CARD_ID = 'dwmt-card';

// ─── State ────────────────────────────────────────────────────────────────────
let isLoading = false;
let sidebarObserver = null;
let theaterObserver = null;
let initObserver = null;

// ─── Guards ───────────────────────────────────────────────────────────────────
const isWatchPage  = () => window.location.pathname === '/watch';
const isTheater    = () => !!document.querySelector('ytd-watch-flexy[theater]');
const cardExists   = () => !!document.getElementById(CARD_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const setLoading = state => {
  isLoading = state;
  const btn = document.getElementById('dwmt-summary-btn');
  if (!btn) return;
  btn.disabled = state;
  btn.textContent = state ? 'Loading…' : 'Summary';
};

const pauseVideo = () => {
  const v = document.querySelector('video');
  if (v && !v.paused) v.pause();
};

const getTimeSaved = () => {
  const v = document.querySelector('video');
  if (!v) return null;
  const saved = Math.max(0, Math.floor(v.duration - v.currentTime));
  if (!saved || isNaN(saved)) return null;
  const h = Math.floor(saved / 3600);
  const m = Math.floor((saved % 3600) / 60);
  const s = saved % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${m}:${String(s).padStart(2,'0')}`;
};

// ─── Card markup ──────────────────────────────────────────────────────────────

// chrome.runtime.getURL throws "Extension context invalidated" if the extension
// was reloaded without refreshing the tab. Guard so the rest of the script
// keeps working (icon just won't show until the tab is refreshed).
const getIconUrl = () => {
  try { return chrome.runtime.getURL('src/assets/ext-icon.png'); } catch { return ''; }
};

const buildCard = () => {
  const card = document.createElement('div');
  card.id = CARD_ID;
  const iconUrl = getIconUrl();
  card.innerHTML = `
    <div class="dwmt-header">
      ${iconUrl ? `<img src="${iconUrl}" class="dwmt-icon" alt="">` : ''}
      <span class="dwmt-title">dontwastemytime</span>
    </div>

    <button id="dwmt-stop-btn" class="dwmt-btn dwmt-btn-stop">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
      </svg>
      stopwastingmytime
    </button>

    <div class="dwmt-grid">
      <button id="dwmt-summary-btn" class="dwmt-btn dwmt-btn-blue">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Summary
      </button>
      <button id="dwmt-transcript-btn" class="dwmt-btn dwmt-btn-blue">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="17" y1="10" x2="3" y2="10"/>
          <line x1="21" y1="6"  x2="3" y2="6"/>
          <line x1="21" y1="14" x2="3" y2="14"/>
          <line x1="17" y1="18" x2="3" y2="18"/>
        </svg>
        Transcription
      </button>
      <button id="dwmt-copy-btn" class="dwmt-btn dwmt-btn-blue">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
      <button id="dwmt-download-btn" class="dwmt-btn dwmt-btn-blue">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download
      </button>
    </div>

    <div id="dwmt-time-msg"  class="dwmt-time-msg"></div>
    <div id="dwmt-output"    class="dwmt-output"></div>
  `;
  return card;
};

// ─── Insertion ────────────────────────────────────────────────────────────────

// Finds the first ytd-compact-video-renderer inside the secondary results column.
// Tries selectors from most-specific to least-specific — covers YouTube A/B variants
// where the container ID or element name may differ.
const getFirstVideoInSidebar = () =>
  document.querySelector('ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer') ||
  document.querySelector('#secondary ytd-compact-video-renderer')  ||
  document.querySelector('#secondary-inner ytd-compact-video-renderer') ||
  document.querySelector('#related ytd-compact-video-renderer');

// In theater mode the sidebar is hidden — attach card to the top of #below instead.
const insertCardTheater = () => {
  const below = document.getElementById('below');
  if (!below) return false;

  const existing = document.getElementById(CARD_ID);
  if (existing && existing.parentElement === below && below.firstElementChild === existing) return true;

  existing?.remove();
  below.insertBefore(buildCard(), below.firstElementChild);
  return true;
};

const insertCard = () => {
  if (!isWatchPage()) return false;
  if (isTheater()) return insertCardTheater();

  const firstVideo = getFirstVideoInSidebar();
  if (!firstVideo) return false;

  const container = firstVideo.parentElement;
  if (!container) return false;

  // Already in the right position — nothing to do.
  const existing = document.getElementById(CARD_ID);
  if (existing && firstVideo.previousElementSibling === existing) return true;

  // Remove stale instance then re-insert before the first real video.
  existing?.remove();
  container.insertBefore(buildCard(), firstVideo);
  return true;
};

const removeCard = () => document.getElementById(CARD_ID)?.remove();

// ─── Observers ────────────────────────────────────────────────────────────────

// Watches the video list container for mutations — re-positions card if YouTube
// re-renders the recommendations list (e.g. chip filter click).
const startSidebarObserver = () => {
  sidebarObserver?.disconnect();
  const container = getFirstVideoInSidebar()?.parentElement;
  if (!container) return;

  sidebarObserver = new MutationObserver(() => {
    if (!isWatchPage() || isTheater()) return; // theater has its own layout
    const firstVideo = container.querySelector('ytd-compact-video-renderer');
    if (!firstVideo) return;
    const card = document.getElementById(CARD_ID);
    if (!card || firstVideo.previousElementSibling !== card) insertCard();
  });

  sidebarObserver.observe(container, { childList: true });
};

// Watches ytd-watch-flexy[theater] — moves card between sidebar and #below on toggle.
const startTheaterObserver = () => {
  theaterObserver?.disconnect();
  const flexy = document.querySelector('ytd-watch-flexy');
  if (!flexy) return;

  theaterObserver = new MutationObserver(() => {
    if (isTheater()) {
      // Move card from sidebar to #below.
      sidebarObserver?.disconnect();
      insertCardTheater();
    } else {
      // Move card back to sidebar — re-attach sidebar observer too.
      if (insertCard()) startSidebarObserver();
    }
  });

  theaterObserver.observe(flexy, { attributes: true, attributeFilter: ['theater'] });
};

// Bootstraps everything: waits for the relevant container to be populated,
// then kicks off the sidebar + theater observers.
const init = () => {
  initObserver?.disconnect();
  theaterObserver?.disconnect();
  sidebarObserver?.disconnect();

  if (!isWatchPage()) return;

  const onReady = () => {
    // In theater mode the sidebar isn't populated — skip the sidebar observer.
    if (!isTheater()) startSidebarObserver();
    startTheaterObserver();
  };

  // Attempt immediate insertion (works on hard refresh when content is already rendered).
  if (insertCard()) { onReady(); return; }

  // Primary: MutationObserver on document.body subtree — fires on any DOM change.
  // insertCard() routes to insertCardTheater() automatically when in theater mode.
  initObserver = new MutationObserver(() => {
    if (!isWatchPage()) { initObserver.disconnect(); return; }
    if (insertCard()) { initObserver.disconnect(); onReady(); }
  });
  initObserver.observe(document.body, { childList: true, subtree: true });

  // Fallback: poll every 500 ms for up to 20 s in case the observer misses a batch.
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (insertCard()) {
      clearInterval(poll);
      initObserver?.disconnect();
      onReady();
      return;
    }
    if (attempts >= 40) {
      clearInterval(poll);
      initObserver?.disconnect();
      if (document.getElementById(CARD_ID) || !isWatchPage()) return;
      if (isTheater()) {
        // Last-resort in theater mode: force into #below.
        const below = document.getElementById('below');
        if (below) { below.insertBefore(buildCard(), below.firstElementChild); onReady(); }
      } else {
        // Last-resort in normal mode: insert above #secondary-inner.
        const sec   = document.getElementById('secondary');
        const inner = document.getElementById('secondary-inner');
        if (sec && inner && sec.contains(inner)) {
          sec.insertBefore(buildCard(), inner);
          onReady();
        }
      }
    }
  }, 500);
};

// ─── Feature handlers ─────────────────────────────────────────────────────────

const expand = () => document.querySelector('tp-yt-paper-button#expand')?.click();

const clickTrans = () =>
  document.querySelector('.yt-spec-button-shape-next--call-to-action')?.click();

const getText = () =>
  Array.from(document.querySelectorAll('ytd-transcript-segment-renderer .segment-text'))
    .map(s => s.innerText).join(' ');

const displayOutput = txt => {
  const c = document.getElementById('dwmt-output');
  if (!c) return;
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
      chrome.runtime.sendMessage({ action: 'fetchSummary', prompt: getText() });
    }, 3000);
  }, 3000);
};

const handleTranscription = () => {
  expand();
  clickTrans();
  setTimeout(() => displayOutput(getText()), 4000);
};

const handleCopy = () => {
  const txt = document.getElementById('dwmt-output')?.innerText;
  if (txt) navigator.clipboard.writeText(txt);
};

const handleDownload = () => {
  const blob = new Blob([getText()], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${document.title}.txt`;
  a.click();
};

const sendChatMessage = (delay = 1000) => {
  const send = (attempts = 0) => {
    const textarea = document.querySelector('yt-chat-input-view-model textarea');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(textarea, 'O vídeo fala sobre qual assunto? Após responder isso em uma linha, resuma em até 5 bullet points curtos o que realmente importa neste vídeo. Sem introdução, sem enrolação.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      setTimeout(() => {
        textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
      }, 500);
    } else if (attempts < 20) {
      setTimeout(() => send(attempts + 1), 500);
    }
  };
  setTimeout(() => send(), delay);
};

const clickAskItem = () => {
  const askItem = Array.from(document.querySelectorAll('tp-yt-paper-item')).find(el => {
    const d = el.querySelector('path')?.getAttribute('d') ?? '';
    return d.includes('M480-80q0-83');
  });
  askItem?.click();
  sendChatMessage(1000);
};

const handleStopWastingMyTime = () => {
  pauseVideo();
  const saved = getTimeSaved();
  const el = document.getElementById('dwmt-time-msg');
  if (el) el.textContent = saved ? `nice, you saved ${saved}` : '';

  const perguntarBtn = document.querySelector('button[aria-label="Perguntar"]');
  if (perguntarBtn) { perguntarBtn.click(); sendChatMessage(1000); }
  else clickAskItem();
};

// ─── Event delegation (set up once — survives card re-injection) ──────────────

document.body.addEventListener('click', e => {
  // Use .closest('button') so clicks on child SVG/text nodes still resolve.
  const id = e.target.closest('button')?.id;
  if (!id) return;
  if (id === 'dwmt-stop-btn')       handleStopWastingMyTime();
  else if (id === 'dwmt-summary-btn')    handleSummary();
  else if (id === 'dwmt-transcript-btn') handleTranscription();
  else if (id === 'dwmt-copy-btn')       handleCopy();
  else if (id === 'dwmt-download-btn')   handleDownload();
});

chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === 'loadSummary') {
    displayOutput(msg.summary);
    setLoading(false);
  }
});

// Re-run on YouTube SPA navigation (video-to-video without full page reload).
document.addEventListener('yt-navigate-finish', () => {
  if (isWatchPage()) init();
  else removeCard();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
init();
