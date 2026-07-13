# Chrome Web Store Screenshot Guide

Use this guide to capture the remaining Store screenshots from a real loaded extension.

## Required Format

- Preferred size: 1280x800
- Accepted size: 640x400
- Use full-bleed screenshots with no padding or rounded corners.
- Do not show real API keys, private files, account names, bookmarks, or private browsing data.

## Recommended Screenshot Set

1. Popup on a normal webpage with a completed page summary.
2. Popup in pasted-text or upload-file mode.
3. Provider settings page with saved provider cards and API key setup guidance.
4. Draggable right-edge page icon on a readable webpage.
5. Links-only output in the popup.

## Capture Steps

1. Load the unpacked extension from this project folder in `chrome://extensions`.
2. Open the options page and add a test provider profile.
3. Use a clean Chrome profile or a test browser window with no personal bookmarks visible.
4. Open a public article page with non-private content.
5. Run a summary and capture the popup.
6. Capture settings, upload/paste mode, on-page icon, and links-only mode.
7. Save final screenshots under `assets/store/screenshots/`.

## Suggested Filenames

- `popup-summary-1280x800.png`
- `popup-upload-1280x800.png`
- `provider-settings-1280x800.png`
- `page-icon-1280x800.png`
- `links-output-1280x800.png`

## Review Checklist

- Text is readable at Store preview size.
- No API key or personal data is visible.
- The UI shown matches the current extension.
- The screenshot communicates one feature clearly.
- The image dimensions match Chrome Web Store requirements.

