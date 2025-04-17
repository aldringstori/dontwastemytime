// src/backend.js (service worker)
const getEndpoint = async () => {
  return new Promise(resolve => {
    chrome.storage.sync.get('endpoint', data => {
      resolve(data.endpoint || 'http://localhost:11434/api/generate');
    });
  });
};

const fetchSummary = async (text) => {
  const endpoint = await getEndpoint();
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "phi3", prompt: text, stream: false })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).response;
};

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "fetchSummary") {
    fetchSummary(req.prompt)
      .then(sum => chrome.tabs.sendMessage(sender.tab.id, { action: "loadSummary", summary: sum }))
      .catch(e => chrome.tabs.sendMessage(sender.tab.id, {
        action: "loadSummary",
        summary: `Error: ${e.message}`
      }));
    return true;
  }
  if (req.action === "verifyEndpoint") {
    getEndpoint().then(ep => sendResponse({ endpoint: ep }));
    return true;
  }
  if (req.action === "testEndpoint") {
    getEndpoint().then(async ep => {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: "phi3", prompt: "Hello", stream: false })
        });
        sendResponse(res.ok ? { success: true } : { success: false, error: `HTTP ${res.status}` });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    });
    return true;
  }
});
