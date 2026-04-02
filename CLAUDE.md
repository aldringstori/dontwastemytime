# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chrome Extension (Manifest V3) that summarizes YouTube video transcripts using a locally-running LLM (Ollama or LLM Studio). No external APIs or paid services are involved.

## Build

```bash
npm install
npx webpack        # outputs dist/bundle.js
```

After building, load the unpacked extension in Chrome at `chrome://extensions/` with Developer Mode enabled.

## Running Locally

Requires a local LLM server:
```bash
ollama run phi3    # default model; listens on localhost:11434
```

The endpoint is configurable via the extension popup (saved to `chrome.storage.sync`). Presets exist for Ollama (`:11434`) and LLM Studio (`:8080`).

## Architecture

The extension has three independently-running scripts that communicate via Chrome message passing:

**`src/backend.js`** — Service worker (background). Handles three message actions:
- `fetchSummary`: POSTs transcript text to the LLM endpoint, returns `response` field
- `verifyEndpoint`: Returns current stored endpoint
- `testEndpoint`: Checks endpoint reachability

**`src/ui.js`** — Content script injected into YouTube pages after a 9-second delay. Injects a sidebar panel into `#secondary` with four buttons:
- **Summary**: Expands transcript → clicks translate → extracts `ytd-transcript-segment-renderer .segment-text` elements → sends to service worker → displays result
- **Transcription**: Same extraction but no LLM call
- **Copy / Download**: Operate on whatever is currently displayed

**`src/popup.html` + `src/popup.js`** — Extension popup for configuring and testing the LLM endpoint.

**`src/utils.js`** — Only exports `getActiveTabURL()` (currently unused in main flow).

**`src/index.js`** — Webpack entry point; imports Ant Design CSS, ui.js, and ui.css.

## Key Hardcoded Values

- LLM model: `phi3` (in `src/backend.js`) — not configurable via UI
- Transcript wait delays: 3s + 3s after clicking expand/translate buttons
- LLM API request format: `{ model, prompt, stream: false }`, response read from `.response`
- Network host permissions in `manifest.json`: `localhost:11434` and `192.168.1.99:11434`
