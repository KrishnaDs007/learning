# Chrome Web Store Upload Guide

Use this guide to upload AI Summariser to the Chrome Web Store.

## Prepared Files

Extension package:

- `dist/ai-summariser-v1.0.0.zip`

Store assets:

- Icon: `assets/icons/icon-128.png`
- Small promotional image: `assets/store/small-promo-440x280.png`
- Screenshots:
  - `assets/store/screenshots/popup-summary-1280x800.png`
  - `assets/store/screenshots/provider-settings-1280x800.png`
  - `assets/store/screenshots/popup-upload-1280x800.png`
  - `assets/store/screenshots/page-icon-1280x800.png`
  - `assets/store/screenshots/links-output-1280x800.png`

Listing copy:

- `docs/chrome-web-store-listing.md`

## Upload Steps

1. Open the Chrome Web Store Developer Dashboard:
   - https://chrome.google.com/webstore/devconsole
2. Sign in with the publisher account.
3. Click `New item`.
4. Upload `dist/ai-summariser-v1.0.0.zip`.
5. Fill in the Store listing fields from `docs/chrome-web-store-listing.md`.
6. Upload the icon, small promotional image, and screenshots listed above.
7. Choose category `Productivity`.
8. Fill in privacy fields using `docs/privacy.md` and the privacy practices text in `docs/chrome-web-store-listing.md`.
9. Add the support URL:
   - https://krishnasportfolio-rho.vercel.app/#contact
10. Review permissions and use the explanations from `docs/chrome-web-store-listing.md`.
11. Save the draft.
12. Run the manual QA checklist from `docs/manual-qa.md` against the zipped extension build.
13. Record the pass/fail results in `docs/manual-qa-results.md`.
14. Submit for review when QA is complete.

## V1 Release Decision

AI Summariser v1 uses bring-your-own-key provider profiles and sends requests directly from the extension to the selected provider.

No backend proxy is included in v1. Revisit a proxy later if public users need managed billing, shared quotas, server-side file/OCR handling, or provider compatibility for endpoints that block browser-origin requests.

## Before Submitting

- Confirm `manifest.json` version is correct.
- Confirm no real API keys appear in screenshots.
- Confirm Store copy mentions direct provider calls and local API key storage.
- Confirm manual QA passes on a freshly loaded unpacked extension.
- Confirm `docs/manual-qa-results.md` has no unresolved blockers.
- Keep `dist/ai-summariser-v1.0.0.zip` as the uploaded package for this version.
