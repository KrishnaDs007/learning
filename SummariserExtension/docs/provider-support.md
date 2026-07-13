# Provider Support Plan

The extension supports multiple AI providers so users can summarise with whichever API access they already have.

## Planned Providers

- Done: Gemini
- Done: OpenAI / ChatGPT API
- Done: Anthropic / Claude API
- Done: xAI / Grok API
- Done: Custom OpenAI-compatible endpoint

## Settings Requirements

Each provider profile stores:

- Provider type
- Display name
- API key
- Model name
- Optional base URL
- Default provider flag

Users can:

- Add more than one provider profile.
- Select a default provider.
- Switch provider/model from the popup before summarising.
- Remove or update provider profiles.
- Create a provider through a modal-style popup.
- Expand saved provider cards to review or update details.
- Keep non-default providers collapsed until they are needed.
- Open provider-specific API key pages from the settings modal.
- Follow short provider-specific steps before pasting the API key.

## API Key Setup Links

The settings page gives users direct landing links for each built-in provider:

- Gemini: [Google AI Studio API keys](https://aistudio.google.com/app/apikey)
- OpenAI / ChatGPT: [OpenAI API keys](https://platform.openai.com/api-keys)
- Anthropic / Claude: [Anthropic Console API keys](https://platform.claude.com/settings/keys)
- xAI / Grok: [xAI Console](https://console.x.ai/)
- Custom OpenAI-compatible: use the provider's own dashboard, then paste the API key, base URL, and model name.

## Implementation Direction

The implementation uses one shared summarisation interface:

```text
summarise({ providerProfile, prompt, sourceText })
```

Then route internally to provider-specific clients:

- `geminiClient`
- `openAiClient`
- `anthropicClient`
- `grokClient`
- `openAiCompatibleClient`

This keeps the popup independent from provider-specific request shapes.

## Settings UX

- The default provider appears expanded so users can see what is active.
- Non-default providers are collapsed to reduce noise.
- Users can expand any saved provider card at any time.
- Creating or editing a provider uses the same modal editor.

## Gemini Model Note

- The default Gemini model is `gemini-3.5-flash`.
- Saved profiles using unavailable Gemini model names such as `gemini-2.5-flash-lite` are migrated to `gemini-3.5-flash`.

## Release Considerations

- API keys stored inside the extension are inspectable by the user and are not suitable for hiding a developer-owned key.
- Decision for v1: keep bring-your-own-key behavior and call providers directly from the extension.
- A backend proxy is not part of the first release because the extension does not ship a developer-owned API key, local key storage keeps the product simpler, and users can choose a provider that works with direct browser requests.
- Revisit a backend proxy later if public users need managed billing, shared quotas, server-side OCR/file parsing, or providers/endpoints that block browser-origin requests.
- Privacy docs must explain that source text is sent to the active selected provider.
- Direct browser API calls can fail if a provider blocks browser-origin requests, changes CORS behavior, or requires a server-side proxy. The popup now converts common provider failures into user-facing guidance for invalid keys, missing models, quota/rate limits, oversized input, endpoint problems, and temporary provider outages.
- Provider profiles and API keys are stored with `chrome.storage.local` so they stay local to the browser profile instead of syncing by default.
