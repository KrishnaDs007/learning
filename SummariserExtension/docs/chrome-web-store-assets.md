# Chrome Web Store Asset Plan

Use this checklist before uploading the extension to the Chrome Web Store.

Official Chrome image guidance:

- Supplying images: https://developer.chrome.com/docs/webstore/images
- Privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy

## Current Icon Assets

The required extension icon sizes exist in `assets/icons/` and are referenced by `manifest.json`.

| File | Current size | Status |
| --- | ---: | --- |
| `assets/icons/icon-16.png` | 16x16 | Ready |
| `assets/icons/icon-32.png` | 32x32 | Ready |
| `assets/icons/icon-48.png` | 48x48 | Ready |
| `assets/icons/icon-128.png` | 128x128 | Ready |
| `assets/icons/icon-1024.png` | 1254x1254 | Source/reference image only |
| `assets/store/small-promo-440x280.png` | 440x280 | Ready |

## Icon Readiness Notes

- The Chrome Web Store requires a 128x128 PNG extension icon in the extension package.
- The current manifest includes 16, 32, 48, and 128 PNG icons.
- Treat the current icon set as final for the next release unless visual QA shows poor contrast on light or dark Chrome backgrounds.
- The 1024 image is not a Store-required icon size because it is 1254x1254. Keep it only as a source/reference asset unless it is regenerated or resized for another purpose.

## Required Store Assets

### Extension Icon

Status: ready.

Use:

- `assets/icons/icon-128.png`

### Screenshots

Status: ready.

Capture guide:

- `docs/store-screenshot-guide.md`

Ready screenshots:

- `assets/store/screenshots/popup-summary-1280x800.png`
- `assets/store/screenshots/provider-settings-1280x800.png`
- `assets/store/screenshots/popup-upload-1280x800.png`
- `assets/store/screenshots/page-icon-1280x800.png`
- `assets/store/screenshots/links-output-1280x800.png`

Chrome accepts screenshots at:

- 1280x800, preferred
- 640x400, accepted

Screenshots should be full bleed with square corners and no padding.

Recommended screenshot set:

1. Done: popup summarising a readable article page.
2. Done: popup using uploaded file mode.
3. Done: provider settings page with saved provider cards and API key setup guidance.
4. Done: on-page draggable right-edge icon on a webpage.
5. Done: links-only extraction output.

Capture notes:

- Use realistic but non-private webpage text.
- Do not show real API keys.
- Do not show private browsing data, account names, bookmarks, or personal files.
- Prefer a clean Chrome profile or crop only the browser content area if allowed by Store quality review.
- Confirm text is readable after downscaling to 640x400.

### Small Promotional Image

Status: ready.

Required size:

- 440x280

Use:

- `assets/store/small-promo-440x280.png`

### Optional Marquee Promotional Image

Status: optional, not needed for first release.

Optional size:

- 1400x560

Create this later only if the extension is being positioned for a more polished public launch.

## Listing Copy Assets

Status: drafted.

Use:

- `docs/chrome-web-store-listing.md`

Included there:

- Short description
- Detailed description
- Privacy practices text
- Permission explanations
- Support/contact wording
- Reviewer test notes

## Pre-upload Asset Checklist

- Confirm `assets/icons/icon-128.png` looks good on light and dark backgrounds.
- Done: capture popup summary screenshot.
- Done: capture provider settings screenshot.
- Done: capture upload/paste, page icon, and links-only screenshots.
- Done: create the 440x280 small promotional image.
- Review all screenshots for hidden API keys or private content.
- Done: add final support contact details in the listing copy.
- Re-check manifest permissions against the permission explanations.
