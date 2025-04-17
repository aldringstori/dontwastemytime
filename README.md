# Free Youtube summarizer extension

Created by Aldrin Gustavo Stori
Inspired by
<br>
<https://github.com/ayaansh-roy/llm_chrome_ext_summerizer>
<br>
<https://github.com/xingyuqiu2/youtube-translator-summarizer-extension>

## Motivation

Watching YouTube videos can often be time-consuming, with crucial information typically scattered throughout the content, sometimes comprising only about 20% of the video. Tools like Sider are incredibly effective in saving time by providing concise summaries that allow you to quickly access the main points. However, free summaries are often limited, and premium options require payment. To help you save both time and money, I have developed this extension, you can use the LLM of your preference.

## Simple explanation how the software works
1. User opens YouTube and clicks on 'Summary' button.
2. Local LLM API processes the request and sends a summary back to the Flask server.
3. The Chrome extension displays the summary in the view box on YouTube.

## Installation

1. Install LLM model (phi3 is the default, but you can use any LLM of your choice.)

```
ollama run phi3
```

2. Clone the repository

```
git clone https://github.com/A-GustavoStori/free-yt-summarizer
```

3. Install the extension
Go into chrome extensions, enable developer mode and click on load unpacked extension, select the folder containing the extension.


