# Privacy Plan

This extension summarises user-provided or webpage text using the AI provider selected by the user.

## Data Sources

The extension may process:

- Text extracted from the active webpage.
- Text selected by the user.
- Text pasted into the popup.
- Text extracted from supported uploaded files, including text-based PDFs and Word documents.
- Links extracted from page or text sources.

## Data Sent To AI Providers

When the user requests a summary, the extension sends the selected source text and summary instructions to the active configured provider.

Planned provider options include:

- Gemini
- OpenAI / ChatGPT API
- Anthropic / Claude API
- xAI / Grok API
- Custom OpenAI-compatible endpoints

## API Key Storage

The extension uses user-provided API keys. Keys are stored locally in Chrome extension storage with `chrome.storage.local`.

Recent summary history is stored locally in Chrome storage and can be cleared from the popup. Because summaries can contain private page content, this history should stay local-only unless the user explicitly opts into sync in a future version.

Before public release, decide whether to:

- Keep bring-your-own-key storage inside the extension.
- Move provider calls behind a backend proxy.
- Keep all sensitive values local-only or add an explicit user-controlled sync option later.

## User Controls

Planned controls:

- Select active provider.
- Add, edit, or remove API keys.
- Choose input source.
- Move the on-page summariser icon vertically or open the popup from it.
- Clear local summary and links history.
