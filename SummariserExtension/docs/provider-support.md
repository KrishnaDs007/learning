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

## Release Considerations

- API keys stored inside the extension are inspectable by the user and are not suitable for hiding a developer-owned key.
- For personal use, user-provided API keys are acceptable with clear privacy wording.
- For public release, decide whether to keep bring-your-own-key behavior or introduce a backend proxy.
- Privacy docs must explain that source text is sent to the active selected provider.
