# Manual QA Checklist

Use this checklist after loading the unpacked extension from this project folder in `chrome://extensions`.

## Setup

- Reload the extension from `chrome://extensions`.
- Refresh any already-open webpage tabs before testing content-script behavior.
- Open the extension settings page and confirm at least one provider profile is saved.
- Confirm the default provider appears selected in the popup.
- Open `chrome://extensions/shortcuts` and confirm `Open AI Summariser` is assigned or assignable.

## Selected Text Flow

- Open a normal article page.
- Select two or more paragraphs of text.
- Right-click and choose `Summarise selection`.
- Open the extension popup if Chrome does not open it automatically.
- Confirm the source label says selected text is ready.
- Click `Run` and confirm a summary appears.
- Click `Copy` and confirm the copied text matches the visible summary.

## Popup Source Flow

- Set `Source` to `Page / selected text` and run a summary on a readable article page.
- Press `Alt+Shift+S` on a normal webpage and confirm the popup opens.
- Set `Source` to `Paste text`, paste custom text, and run a summary.
- Set `Source` to `Upload file`, choose a supported file, and run a summary.
- Change `Content` between `Auto`, `Documentation`, and `Forum thread` on suitable sources and confirm the output focus changes.
- Switch `Output` to `Links only` and confirm links render without requiring a provider.
- Confirm recent history shows the latest summary or links output.
- Click a recent history item and confirm it restores into the output panel.
- Click `Clear` in recent history and confirm the history panel disappears.

## On-page Icon Flow

- Confirm the right-edge icon appears on a page with enough readable text.
- Drag the icon up and down and confirm it stays inside the visible window.
- Hover the icon and confirm the tooltip appears above it.
- Hover the icon and confirm the close button appears beside it.
- Click the icon and confirm the extension popup opens or the extension badge fallback appears.

## Expected Error States

- Run on `chrome://extensions` or another restricted page and confirm the popup shows a readable access error.
- Run on a Chrome Web Store page and confirm the popup explains that Chrome blocks that page.
- Open a PDF directly in a browser tab and confirm the popup asks the user to download and upload the PDF instead.
- Try summarising with no saved provider and confirm settings opens.
- Upload an unsupported file type and confirm the unsupported-file message is clear.
- Try an empty file and confirm the popup shows an empty-file message.
- Try a renamed or corrupt PDF/DOCX file and confirm the popup shows a readable bad-file message.
