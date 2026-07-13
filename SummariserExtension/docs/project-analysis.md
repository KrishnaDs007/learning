# AI Summariser Extension - Project Analysis

Analysis date: 2026-07-11

## Purpose

This project is a Chrome Manifest V3 extension that extracts text from the active webpage and sends it to the Gemini API to generate a summary. The extension currently supports three summary modes: brief, detailed, and bullets.

## Current file map

- `manifest.json`: extension metadata, permissions, popup registration, icon paths, content script registration, background service worker, and options page.
- `src/background/background.js`: initializes extension state, opens the options page when no Gemini API key is saved, and stores selected text from the context-menu flow for popup summarisation.
- `src/content/content.js`: extracts selected text, article/main text, or useful paragraphs from the current page.
- `src/popup/popup.html`: popup UI for summary controls, source status, result display, and actions.
- `src/popup/popup.css`: popup visual styling and interaction states.
- `src/popup/popup.js`: reads the API key, summarises selected text when available, asks the active tab for text otherwise, injects the content script if needed, calls Gemini, renders the returned summary, and supports copying the result.
- `src/options/options.html`: API key settings page with a link to Google AI Studio.
- `src/options/options.css`: settings page styling.
- `src/options/options.js`: loads, saves, shows/hides, and clears provider profiles and API keys using local Chrome extension storage.
- `assets/icons/`: generated extension icon assets in Chrome sizes.

## Current user flow

1. The user installs or loads the extension.
2. The background worker enables the summariser and opens the options page if no Gemini API key is stored.
3. The user saves a Gemini API key in the options page.
4. The user opens the popup on a webpage.
5. The popup asks the content script to extract page text.
6. The popup sends the extracted text to the Gemini API.
7. The popup displays the generated summary.

Selected-text flow:

1. The user selects text on a page.
2. The user chooses "Summarise Selection" from the browser context menu.
3. The background worker stores that selected text locally and opens the popup.
4. The next summary request uses the selected text instead of extracting the full page.

## Strengths

- The extension is small and easy to understand.
- It already separates browser responsibilities into popup, options, background, and content scripts.
- It handles missing content scripts by attempting runtime injection.
- It supports multiple summary styles.
- It uses local Chrome extension storage for provider profiles and API keys so sensitive values do not sync across Chrome profiles by default.
- It now keeps the Gemini model name and input character limit in constants.
- It now avoids logging API keys, raw page text, or full prompts.
- It now has a clearer `src/` and `assets/` folder structure.
- It now has dedicated CSS files for the popup and options page.
- It now includes generated icon assets for extension use.

## Issues and risks

- The Gemini model string should be verified before release. Current code uses `gemini-3.1-flash-lite`; Google lists newer stable and deprecated model states in the Gemini model docs.
- The Gemini API key is stored in the browser. This is acceptable for a personal/local extension, but it is not ideal for a public production extension because users can inspect extension storage and network calls.
- Text extraction is basic and may include navigation, ads, comments, or miss dynamic article content.
- The current code truncates extracted text to 6,000 characters, which keeps requests controlled but may miss important content in very long pages.
- There are no automated tests, linting, formatting rules, or release checklist yet.
- `chrome.action.openPopup()` support can vary by Chrome version and policy context, so the selected-text context-menu flow should be manually tested in Chrome.

## Completed first-step fixes

- Added `.gitignore`.
- Added the `docs/` folder with analysis and roadmap files.
- Added the missing `contextMenus` permission.
- Added a context-menu click handler for selected text.
- Implemented the Copy button.
- Removed sensitive prompt/API-key/raw-text logging.
- Moved the Gemini model and input limit into top-level constants.
- Open the options page from the popup when no API key is configured.
- Reorganized files into `src/` and `assets/`.
- Added dedicated popup and options CSS.
- Improved popup source status, loading, success, error, copy, and settings states.
- Added generated icon assets.

## External reference notes

- The provided Stitch URL was checked: `https://stitch.withgoogle.com/projects/18348981032040753318`.
- The page did not return usable project details through the available web access. Treat the Stitch design as not yet imported into this repo.
- Next step: add screenshots or an exported design brief from Stitch to `docs/design-notes.md` so implementation can match the intended interface.
- Gemini docs checked: `https://ai.google.dev/gemini-api/docs/models` and `https://ai.google.dev/gemini-api/docs/text-generation`.
- As of Google's model docs last updated 2026-07-09, stable text-capable options include Gemini 3.5 Flash and Gemini 3.1 Flash-Lite, while some older/preview entries are deprecated or shut down. Production code should pin a stable model string and document why it was chosen.

## Recommended technical direction

Keep this as a clean Manifest V3 extension, but reorganize it into clearer modules before adding major features:

- Move inline CSS into dedicated files.
- Add a shared constants/config file for model name, request limits, and default settings.
- Add a Gemini client module that handles request building, response parsing, and errors.
- Add a content extraction module that can be improved independently.
- Add a small state layer for popup UI states: idle, loading, success, error, and copied.
