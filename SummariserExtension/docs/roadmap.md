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
- Manually test the selected-text popup flow in Chrome.

## Phase 2 - Clean project structure

Goal: make the extension easy to maintain.

- Done: move popup CSS into `src/popup/popup.css`.
- Done: move options CSS into `src/options/options.css`.
- Done: reorganize source files under `src/` and generated icons under `assets/icons/`.
- Split Gemini API code into a separate script/module.
- Keep prompt templates in one place.
- Add `README.md` with installation, local development, and usage instructions.
- Add `docs/release-checklist.md` before packaging.

## Phase 3 - Improve user experience

Goal: make the extension feel polished and useful every day.

- Redesign the popup with a professional compact layout inspired by the Stitch direction once screenshots/specs are available.
- Add summary length controls: short, medium, detailed.
- Add output formats: paragraph, bullets, key takeaways, action items.
- Add a "summarise selected text" path.
- Add visible loading, retry, copied, and empty-content states.
- Show source metadata when available: page title, domain, estimated reading length.
- Add recent summaries/history with a user-controlled clear option.

## Phase 4 - Improve summarisation quality

Goal: produce better summaries from real webpages.

- Improve extraction by removing repeated navigation text and filtering tiny paragraphs.
- Support selected text first, article body second, full-page fallback last.
- Increase input handling beyond 2,000 characters with chunking or smarter trimming.
- Add prompt templates for different content types: article, documentation, tutorial, product page, forum thread.
- Add safety handling for blocked pages, PDFs, Chrome internal pages, and pages where content scripts cannot run.

## Phase 5 - Security, privacy, and release readiness

Goal: prepare for public use or a polished personal release.

- Add a privacy note explaining what text is sent to Gemini.
- Consider using `chrome.storage.local` for sensitive settings if sync is not required.
- Avoid broad `<all_urls>` host permissions where possible.
- Add manual QA cases for common sites and blocked pages.
- Add Chrome Web Store assets: icons, screenshots, description, privacy disclosures.
- Decide whether direct browser API-key usage is acceptable or whether a backend proxy is needed.

## Phase 6 - Optional advanced features

Goal: differentiate the extension.

- Add keyboard shortcuts.
- Add export options: copy Markdown, save text, share to notes.
- Add multi-language summaries.
- Add "ask follow-up question about this page."
- Add custom user prompts.
- Add model selector for power users.

## Proposed next implementation order

1. Fix permissions, remove sensitive logging, and implement Copy.
2. Add selected-text/context-menu summarisation properly.
3. Refactor CSS and Gemini request code into maintainable files.
4. Redesign popup using the Stitch reference once screenshots or export details are available.
5. Add README and release checklist.
