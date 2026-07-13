# Release Readiness Checklist

## Product Scope

- Confirm supported input modes:
  - Done: current page
  - Done: selected text
  - Done: pasted text
  - Done: uploaded text files
  - Done: PDF upload text extraction for text-based PDFs
  - Done: DOCX upload text extraction
  - Done: best-effort legacy DOC upload text recovery
- Confirm supported output modes:
  - Brief summary
  - Detailed summary
  - Bullets
  - Key takeaways
  - Done: links only
- Confirm content-aware prompt modes:
  - Done: auto
  - Done: article
  - Done: documentation
  - Done: tutorial
  - Done: product page
  - Done: forum thread
- Confirm supported providers:
  - Done: Gemini
  - Done: OpenAI / ChatGPT API
  - Done: Anthropic / Claude API
  - Done: xAI / Grok API
  - Done: Custom OpenAI-compatible endpoint

## Privacy And Permissions

- Done: add a privacy document explaining what text is collected and where it is sent.
- Done: explain that the active provider receives the summarised source text.
- Done: explain how API keys are stored.
- Done: use `chrome.storage.local` for provider profiles and API keys.
- Done: narrow automatic content-script access to `http://` and `https://` pages instead of broad `<all_urls>`.
- Review direct browser provider calls and decide whether any public release needs a backend proxy for providers that block browser-origin requests.
- Done: add Chrome Web Store permission explanations.

## Chrome Web Store Assets

- Done: extension icon sizes: 16, 32, 48, 128.
- Done: draft short description.
- Done: draft detailed description.
- Done: draft privacy practices text.
- Done: draft support/contact wording.
- Store screenshots.
- Done: small promotional image.
- Add final public support contact/link before publishing.

## Pre-release Manual Checks

Testing automation is not planned for the current pass, but before release manually check:

- Normal webpage summary.
- Selected-text summary.
- Pasted-text summary.
- Text-file upload summary.
- Link extraction mode.
- Content type selector changes summary focus.
- Missing API key state.
- Invalid API key state.
- Unavailable model state.
- Provider quota/rate-limit state.
- Provider endpoint or direct-browser request failure state.
- Provider switching.
- Blocked pages such as `chrome://` pages.
- Chrome Web Store page access error.
- Direct PDF tab guidance to use Upload file.
- Extension reload after settings changes.
