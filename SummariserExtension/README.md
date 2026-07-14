# AI Summariser Chrome Extension

AI Summariser is a Chrome Manifest V3 extension that extracts text from webpages and user-provided sources, then generates summaries using the AI provider selected by the user.

It supports summarising the full page content, selected text, pasted text, and uploaded text-based files. It can also extract links from supported sources.

## Features

- Summarise webpage text with configured AI providers.
- Configure Gemini, OpenAI / ChatGPT, Anthropic / Claude, xAI / Grok, or a custom OpenAI-compatible endpoint.
- Gemini defaults to `gemini-3.5-flash`.
- Choose from brief, detailed, and bullet-point summary modes.
- Tune summaries for articles, documentation, tutorials, product pages, or forum threads.
- Control summary length with short, medium, and long options.
- Choose the summary output language.
- Summarise selected text from the right-click context menu.
- Paste text directly into the popup.
- Upload `.txt`, `.md`, `.csv`, `.json`, `.html`, text-based `.pdf`, `.docx`, and best-effort legacy `.doc` files.
- Extract links only from page or text sources.
- Copy generated summaries to the clipboard.
- Copy Markdown exports or save output as a `.txt` file.
- Use a cleaner popup with source status, loading, success, and error states.
- Use a compact draggable on-page icon that stays on the right edge and reappears after the popup closes.
- Open the popup with the default keyboard shortcut `Alt+Shift+S`.
- Store and restore recent summary/link outputs from local history.
- Store provider API keys locally in Chrome extension storage.
- Get provider-specific API key steps directly from the settings page.
- Close the settings window manually or let it auto-close after saving.
- Hide settings success messages automatically after a short readable delay.
- Open the options page automatically when no API key is configured.

## Project Structure

```text
.
|-- assets/
|   |-- icons/          # Extension icon assets in Chrome-required sizes
|   `-- store/          # Chrome Web Store promotional assets
|-- docs/               # Project analysis, roadmap, and future docs
|-- manifest.json       # Chrome extension manifest
|-- src/
|   |-- background/     # Extension install setup and context-menu flow
|   |-- content/        # Webpage text extraction
|   |-- options/        # Settings page for provider profiles and API keys
|   |-- popup/          # Popup UI, provider request, and copy flow
|   `-- shared/         # Prompt and provider client helpers
`-- README.md
```

## Setup

1. Get an API key from your chosen provider, such as [Google AI Studio](https://aistudio.google.com/app/apikey), [OpenAI](https://platform.openai.com/api-keys), [Anthropic](https://platform.claude.com/settings/keys), or [xAI](https://console.x.ai/).
2. Open Chrome and go to `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select this project folder.
6. Open the extension options page and save at least one provider profile.

## Usage

To summarise a page:

1. Open a webpage.
2. Click the AI Summariser extension icon or press `Alt+Shift+S`.
3. Choose a summary type.
4. Click `Summarise`.
5. Use `Copy` to copy the result.

To change the shortcut:

1. Open `chrome://extensions/shortcuts`.
2. Find `AI Summariser`.
3. Update the `Open AI Summariser` shortcut.

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
- Added expandable provider cards with modal creation/editing.
- Added provider-specific API key setup steps inside the settings modal.
- Added a settings close button and cancelable auto-close after provider saves.
- Added auto-hiding success messages in settings.
- Added local recent-output history with restore and clear controls.
- Replaced the on-page prompt with a compact draggable right-edge icon.
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

The extension sends source text to the AI provider selected by the user. Provider API keys are stored locally in Chrome extension storage. Before publishing publicly, review whether direct API-key usage is appropriate for the target audience.

## Documentation

- [Project analysis](./docs/project-analysis.md)
- [Roadmap](./docs/roadmap.md)
- [Provider support](./docs/provider-support.md)
- [Release checklist](./docs/release-checklist.md)
- [Privacy plan](./docs/privacy.md)
- [Docs index](./docs/README.md)
