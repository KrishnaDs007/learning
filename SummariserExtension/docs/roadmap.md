# Professionalization Roadmap

This roadmap is ordered so each step improves the extension without making the project hard to reason about.

## Phase 1 - Stabilize the current extension

Goal: fix obvious bugs and remove release-blocking risks.

- Done: add missing `contextMenus` permission.
- Done: implement a basic context-menu selected-text flow.
- Done: remove logging of API keys, raw page text, and full prompts.
- Done: implement the Copy button.
- Done: open the options page from the popup when no API key is configured.
- Done: make Gemini model name configurable in one place.
- Done: replace many generic errors with user-friendly states.
- Done: add a manual QA checklist for selected-text and popup flow in Chrome.

## Phase 2 - Clean project structure

Goal: make the extension easy to maintain.

- Done: move popup CSS into `src/popup/popup.css`.
- Done: move options CSS into `src/options/options.css`.
- Done: reorganize source files under `src/` and generated icons under `assets/icons/`.
- Done: split provider API code into `src/shared/providers.js`.
- Done: keep prompt templates in `src/shared/prompts.js`.
- Done: add `README.md` with installation, local development, and usage instructions.
- Done: add `docs/release-checklist.md` before packaging.

## Phase 3 - Improve user experience

Goal: make the extension feel polished and useful every day.

- Done: redesign the popup with a professional compact layout.
- Done: add summary length controls: short, medium, detailed.
- Done: add output formats: brief, detailed, bullets, and key takeaways.
- Done: add a "summarise selected text" path.
- Done: add a paste-text input mode so users can paste any text and summarise it directly.
- Add an upload input mode for documents:
  - Done: first support text-based files such as `.txt`, `.md`, `.csv`, `.json`, and `.html`.
  - Done: add browser-side PDF extraction for text-based PDFs.
  - Done: add DOCX extraction and best-effort legacy DOC text recovery.
- Done: add a small on-page summarisation prompt with a close button.
- Done: convert the on-page summarisation prompt into a compact draggable right-edge icon.
- Done: add an "extract links only" mode for page, selected text, pasted text, or uploaded source content.
- Done: add visible loading, copied, and empty-content/error states.
- Done: show source metadata when available: page title/domain and estimated word count.
- Done: add recent summaries/history with a user-controlled clear option.

## Phase 3.5 - Multi-provider model support

Goal: let users use whichever AI provider and API key they already have.

- Done: add provider settings for Gemini.
- Done: add provider settings for OpenAI / ChatGPT API.
- Done: add provider settings for Anthropic / Claude API.
- Done: add provider settings for xAI / Grok API.
- Done: add provider settings for future custom OpenAI-compatible endpoints.
- Done: let users add multiple provider configurations.
- Done: let users choose a default provider.
- Done: let users switch provider/model from the popup before summarising.
- Done: store provider records with provider type, display name, API key, selected model, optional base URL, and default flag.
- Done: add provider-specific API clients behind one shared summarisation interface.
- Done: add model presets but allow custom model names for advanced users.
- Done: open new provider creation in a modal-style popup.
- Done: show existing providers as an expandable list.
- Done: keep the default provider expanded and non-default providers collapsed by default.
- Done: add draft privacy wording that text is sent to the selected provider, not always Gemini.

## Phase 4 - Improve summarisation quality

Goal: produce better summaries from real webpages.

- Done: improve extraction by removing repeated navigation text and filtering tiny paragraphs.
- Done: support selected text first, article body second, full-page fallback last.
- Done: increase input handling with chunked representative long-document prompts.
- Done: add prompt templates for different content types: article, documentation, tutorial, product page, forum thread.
- Done: add safety handling for blocked pages, direct PDF tabs, Chrome internal pages, Chrome Web Store pages, and pages where content scripts cannot run.

## Phase 5 - Security, privacy, and release readiness

Goal: prepare for public use or a polished personal release.

- Done: add a draft privacy note explaining what text is sent to the selected provider.
- Done: update privacy wording for multi-provider support: Gemini, OpenAI, Anthropic, Grok, or any selected custom provider.
- Done: use `chrome.storage.local` for provider profiles and API keys.
- Done: keep API keys browser-stored with direct provider calls for v1; revisit backend proxy only if public usage requires managed billing, shared quotas, or provider compatibility.
- Done: avoid broad `<all_urls>` host permissions by limiting automatic content-script access to `http://` and `https://` pages.
- Add manual QA cases for common sites and blocked pages later. Testing automation is intentionally not part of the current pass.
- Add Chrome Web Store assets: icons, screenshots, description, privacy disclosures.
- Done: draft Chrome Web Store short description, detailed description, privacy practices text, support wording, and permission explanations.
- Done: confirm Chrome-required icon sizes are present in `assets/icons/`.
- Done: add a Chrome Web Store 440x280 small promotional image.
- Done: add Chrome Web Store screenshots captured from the loaded extension and prepared product screenshots for upload/paste, on-page icon, and links-only output.
- Done: direct browser API-key usage is acceptable for v1; backend proxy is deferred.
- Done: add `docs/release-checklist.md`.
- Done: add `docs/privacy.md`.
- Done: add `docs/provider-support.md` describing supported providers, required keys, and model configuration.

## Phase 6 - Optional advanced features

Goal: differentiate the extension.

- Done: add keyboard shortcut support with `Alt+Shift+S` opening the popup.
- Add export options: copy Markdown, save text, share to notes.
- Add multi-language summaries.
- Add "ask follow-up question about this page."
- Add custom user prompts.
- Add model selector for power users.

## Proposed next implementation order

1. Done: tighten provider error messages and direct-browser API limitations.
2. Done: add final Chrome Web Store copy and permission explanations.
3. Done: complete Chrome Web Store screenshots.
4. Done: add prompt templates for different content types.
5. Done: add safety handling for blocked pages, direct PDF tabs, Chrome internal pages, Chrome Web Store pages, and pages where content scripts cannot run.
