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

Status: still needs capture from the loaded extension.

Chrome accepts screenshots at:

- 1280x800, preferred
- 640x400, accepted

Screenshots should be full bleed with square corners and no padding.

Recommended screenshot set:

1. Popup summarising a readable article page.
2. Popup using pasted text or uploaded file mode.
3. Provider settings page with saved provider cards and API key setup guidance.
4. On-page draggable right-edge icon on a webpage.
5. Links-only extraction output.

Capture notes:

- Use realistic but non-private webpage text.
- Do not show real API keys.
- Do not show private browsing data, account names, bookmarks, or personal files.
- Prefer a clean Chrome profile or crop only the browser content area if allowed by Store quality review.
- Confirm text is readable after downscaling to 640x400.

### Small Promotional Image

Status: needs creation.

Required size:

- 440x280

Recommended direction:

- Use the extension icon and a clean product-focused composition.
- Avoid heavy text because promo images are shown small.
- Communicate summarising, provider choice, and quick reading without relying on a screenshot.

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
- Capture at least one 1280x800 screenshot.
- Prefer capturing all five recommended screenshots.
- Create the 440x280 small promotional image.
- Review all screenshots for hidden API keys or private content.
- Add final support contact details in the listing copy.
- Re-check manifest permissions against the permission explanations.

