# AI Summariser Chrome Extension

AI Summariser is a Chrome Manifest V3 extension that extracts text from webpages and user-provided sources, then generates summaries using the AI provider selected by the user.

It supports summarising the full page content, selected text, pasted text, and uploaded text-based files. It can also extract links from supported sources.

## Features

- Summarise webpage text with configured AI providers.
- Configure Gemini, OpenAI / ChatGPT, Anthropic / Claude, xAI / Grok, or a custom OpenAI-compatible endpoint.
- Choose from brief, detailed, and bullet-point summary modes.
- Control summary length with short, medium, and long options.
- Summarise selected text from the right-click context menu.
- Paste text directly into the popup.
- Upload text-based files such as `.txt`, `.md`, `.csv`, `.json`, and `.html`.
- Extract links only from page or text sources.
- Copy generated summaries to the clipboard.
- Use a cleaner popup with source status, loading, success, and error states.
- Store the Gemini API key in Chrome extension storage.
- Open the options page automatically when no API key is configured.

## Project Structure

```text
.
|-- assets/
|   `-- icons/          # Extension icon assets in Chrome-required sizes
|-- docs/               # Project analysis, roadmap, and future docs
|-- manifest.json       # Chrome extension manifest
|-- src/
|   |-- background/     # Extension install setup and context-menu flow
|   |-- content/        # Webpage text extraction
|   |-- options/        # Settings page for Gemini API key
|   |-- popup/          # Popup UI, provider request, and copy flow
|   `-- shared/         # Prompt and provider client helpers
`-- README.md
```

## Setup

1. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this project folder.
6. Open the extension options page and save at least one provider profile.

## Usage

To summarise a page:

1. Open a webpage.
2. Click the AI Summariser extension icon.
3. Choose a summary type.
4. Click `Summarise`.
5. Use `Copy` to copy the result.

To summarise pasted text:

1. Open the extension popup.
2. Set `Source` to `Paste text`.
3. Paste the text.
4. Click `Run`.

To summarise a file:

1. Open the extension popup.
2. Set `Source` to `Upload file`.
3. Choose a supported text-based file.
4. Click `Run`.

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
- Added a more professional popup and options experience.
- Added pasted-text and text-file source modes.
- Added links-only extraction.
- Added multi-provider settings and provider selection.
- Added a dismissible on-page summarisation prompt.
- Reorganized files into `src/` and `assets/`.
- Added generated icon assets for Chrome extension sizes.
- Added project documentation.
- Added `.gitignore`.

## Roadmap

Next priorities:

- Improve webpage text extraction.
- Finalize release and privacy wording before publishing.
- Add richer PDF/DOC/DOCX support after choosing a parsing strategy.

See [docs/roadmap.md](./docs/roadmap.md) for the detailed plan.

## Privacy Note

The extension sends source text to the AI provider selected by the user. Provider API keys are stored in Chrome extension storage. Before publishing publicly, add final privacy wording and review whether direct API-key usage is appropriate for the target audience.

## Documentation

- [Project analysis](./docs/project-analysis.md)
- [Roadmap](./docs/roadmap.md)
- [Provider support](./docs/provider-support.md)
- [Release checklist](./docs/release-checklist.md)
- [Privacy plan](./docs/privacy.md)
- [Docs index](./docs/README.md)
