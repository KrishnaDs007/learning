# Chrome Web Store Listing Draft

Use this as the source copy for the Chrome Web Store Developer Dashboard.

## Extension Name

AI Summariser

## Short Description

Summarise webpages, selected text, pasted text, files, and links with your own AI provider key.

## Detailed Description

AI Summariser helps you turn long webpages and user-provided text into clear, useful summaries directly from Chrome.

Use it to summarise:

- Current webpage content
- Selected text from a page
- Pasted text
- Uploaded text, Markdown, CSV, JSON, HTML, PDF, DOCX, and best-effort legacy DOC files
- Links extracted from webpages or text sources

You can choose the provider you already use:

- Gemini
- OpenAI / ChatGPT API
- Anthropic / Claude API
- xAI / Grok API
- Custom OpenAI-compatible endpoints

Key features:

- Compact popup for choosing source, provider, summary style, and output length
- Brief, detailed, bullet, and key-takeaway summary modes
- Content-aware prompt modes for articles, documentation, tutorials, product pages, and forum threads
- Links-only extraction mode
- Right-click selected-text summarisation
- Draggable right-edge page icon for quick access
- Recent local history with restore and clear controls
- Provider-specific setup links for creating API keys
- Clear error states for invalid keys, missing models, quota limits, blocked pages, and unsupported files

Privacy-focused bring-your-own-key design:

AI Summariser does not include a shared developer API key. You add your own provider API key in the settings page. When you run a summary, the selected source text is sent directly from the extension to the provider profile you choose. Recent summary history is stored locally in Chrome storage and can be cleared from the popup.

Current limitations:

- Image-only or scanned PDFs are not supported because OCR is not included.
- Some Chrome internal pages and restricted websites cannot be read by browser extensions.
- Some AI providers or custom endpoints may require a backend proxy if they block direct browser requests.

## Category

Productivity

## Language

English

## Single Purpose Statement

AI Summariser lets users summarise or extract links from webpage content, selected text, pasted text, and supported uploaded files using the AI provider profile they configure.

## Privacy Practices Text

AI Summariser processes text only when the user asks it to summarise or extract links.

The extension may process webpage text, selected text, pasted text, uploaded file text, extracted links, provider profile details, and recent summary output. Summary requests are sent to the active AI provider selected by the user, such as Gemini, OpenAI, Anthropic, xAI, or a custom OpenAI-compatible endpoint. The extension does not sell user data and does not use user data for advertising.

Provider API keys are stored locally in Chrome extension storage so the user can run summaries with their own provider account. Recent summary and links history is also stored locally and can be cleared from the popup.

## Remote Code Declaration

No remote code is loaded or executed.

The extension sends HTTPS API requests to the user's selected AI provider. Those providers return summary text or error responses, not executable extension code.

## Permission Explanations

### `activeTab`

Required so the popup can read the active tab after the user opens the extension or requests a summary.

### `contextMenus`

Required to add the right-click selected-text summarisation command.

### `storage`

Required to save provider profiles, the selected default provider, temporary selected-text handoff state, on-page icon position, and local recent summary/history data.

### `scripting`

Required to inject the content script into the active tab when Chrome has not already loaded it, so the extension can read page text after a user action.

### Site access

The content script is limited to normal `http://` and `https://` webpages. This lets the extension show the optional on-page summariser icon and extract page text on standard websites. Chrome internal pages, Chrome Web Store pages, browser extension pages, and direct PDF tabs are blocked or handled with user-facing guidance.

## Support / Contact Wording

Status: needs final public support email, GitHub Issues link, or project website before publishing.

Suggested text:

For help, bug reports, or feature requests, contact the developer through the support link listed on this Chrome Web Store page. Please include the Chrome version, extension version, provider type, and a short description of what you were trying to summarise. Do not send API keys or private page content in support requests.

## Review Notes For Testers

1. Load the extension and open the options page.
2. Add a provider profile using a valid API key.
3. Open a normal article page.
4. Use the popup to summarise the page.
5. Select text and use the context menu item to test selected-text summarisation.
6. Try paste, upload, and links-only modes from the popup.
