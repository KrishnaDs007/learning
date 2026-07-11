# Privacy Plan

This extension summarises user-provided or webpage text using the AI provider selected by the user.

## Data Sources

The extension may process:

- Text extracted from the active webpage.
- Text selected by the user.
- Text pasted into the popup.
- Text extracted from supported uploaded files.
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

The extension should use user-provided API keys. Keys are stored in Chrome extension storage.

Before public release, decide whether to:

- Keep bring-your-own-key storage inside the extension.
- Move provider calls behind a backend proxy.
- Use `chrome.storage.local` instead of `chrome.storage.sync` for sensitive values.

## User Controls

Planned controls:

- Select active provider.
- Add, edit, or remove API keys.
- Choose input source.
- Close the on-page summarisation prompt.
- Clear local history if summary history is added.

