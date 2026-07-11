# AI Summariser Chrome Extension

AI Summariser is a Chrome Manifest V3 extension that extracts text from the current webpage and generates a summary using the Gemini API.

It supports summarising the full page content from the popup and selected text from the browser context menu.

## Features

- Summarise webpage text with Gemini.
- Choose from brief, detailed, and bullet-point summary modes.
- Summarise selected text from the right-click context menu.
- Copy generated summaries to the clipboard.
- Store the Gemini API key in Chrome extension storage.
- Open the options page automatically when no API key is configured.

## Project Structure

```text
.
|-- background.js       # Extension install setup and context-menu flow
|-- content.js          # Extracts article or paragraph text from webpages
|-- docs/               # Project analysis, roadmap, and future docs
|-- icon.png            # Extension icon
|-- manifest.json       # Chrome extension manifest
|-- option.html         # Settings page for Gemini API key
|-- option.js           # Saves and loads API key settings
|-- popup.html          # Extension popup UI
`-- popup.js            # Popup behavior, Gemini request, and copy flow
```

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this project folder.
6. Open the extension options page and save your Gemini API key.

## Usage

To summarise a page:

1. Open a webpage.
2. Click the AI Summariser extension icon.
3. Choose a summary type.
4. Click `Summarise`.
5. Use `Copy` to copy the result.

To summarise selected text:

1. Select text on a webpage.
2. Right-click the selection.
3. Choose `Summarise Selection`.
4. Use the popup to generate the summary.

## Current Status

This is an early working version. The core extension flow is in place, and the first stabilization pass has been completed:

- Added missing context-menu permission.
- Added selected-text summarisation flow.
- Removed sensitive debug logging.
- Added Copy button behavior.
- Added project documentation.
- Added `.gitignore`.

## Roadmap

Next priorities:

- Improve user-facing error states.
- Move inline CSS into dedicated stylesheet files.
- Refactor Gemini request logic into a separate module.
- Improve webpage text extraction.
- Add a more professional popup design.
- Add release and privacy documentation before publishing.

See [docs/roadmap.md](./docs/roadmap.md) for the detailed plan.

## Privacy Note

The extension sends extracted webpage text or selected text to the Gemini API to generate summaries. The Gemini API key is stored in Chrome extension storage. Before publishing publicly, add a clear privacy policy and review whether direct API-key usage is appropriate for the target audience.

## Documentation

- [Project analysis](./docs/project-analysis.md)
- [Roadmap](./docs/roadmap.md)
- [Docs index](./docs/README.md)
