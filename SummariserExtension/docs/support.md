# Support Guide

Use this wording for Chrome Web Store support replies, portfolio contact responses, or a future dedicated support page.

## Public Contact

- Support page: https://krishnasportfolio-rho.vercel.app/#contact
- Support email: krishnadevashish17@gmail.com

## What Users Should Include

Ask users to include:

- Chrome version.
- Extension version.
- Provider type, such as Gemini, OpenAI, Anthropic, xAI, or custom.
- Source mode, such as page, selected text, paste, upload, or links only.
- The exact visible error message.
- Whether the issue happens on one site or every site.

Ask users not to include:

- API keys.
- Private page content.
- Uploaded documents.
- Full provider billing or account screenshots.

## Common Replies

### Missing Or Invalid API Key

Open the extension settings page, expand the provider, and confirm the API key is correct, active, and allowed to use the selected model. If needed, create a new key from the provider dashboard and save it again.

### Unavailable Model

The selected model may not be available for the account or provider region. Open settings and update the provider model, or use the popup model override for a one-off test.

### Blocked Page

Chrome blocks extensions from reading some pages, including internal Chrome pages, Chrome Web Store pages, extension pages, and some restricted sites. Use selected text, pasted text, or file upload for those cases.

### PDF Or File Issue

Text-based PDFs and Word documents are supported. Scanned or image-only PDFs need OCR, which is not included in this release. Empty, corrupt, password-protected, or unsupported files should show a readable error instead of crashing.

### Provider Network Or CORS Issue

AI Summariser v1 sends requests directly from the browser to the selected provider using the user's own API key. Some providers or custom endpoints may block browser-origin requests. If that happens, use a provider that supports direct browser calls or consider a backend proxy in a future release.
