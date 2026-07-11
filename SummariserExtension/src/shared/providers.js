(function () {
	const STORAGE_KEYS = {
		profiles: "providerProfiles",
		defaultProfileId: "defaultProviderId",
		legacyGeminiKey: "geminiApiKey",
	};

	const PROVIDERS = {
		gemini: {
			label: "Gemini",
			defaultModel: "gemini-3.5-flash",
			baseUrl: "https://generativelanguage.googleapis.com",
			requiresBaseUrl: false,
		},
		openai: {
			label: "OpenAI / ChatGPT",
			defaultModel: "gpt-4.1-mini",
			baseUrl: "https://api.openai.com/v1",
			requiresBaseUrl: false,
		},
		anthropic: {
			label: "Anthropic / Claude",
			defaultModel: "claude-sonnet-4-20250514",
			baseUrl: "https://api.anthropic.com/v1",
			requiresBaseUrl: false,
		},
		grok: {
			label: "xAI / Grok",
			defaultModel: "grok-3-mini",
			baseUrl: "https://api.x.ai/v1",
			requiresBaseUrl: false,
		},
		custom: {
			label: "Custom OpenAI-compatible",
			defaultModel: "model-name",
			baseUrl: "",
			requiresBaseUrl: true,
		},
	};

	const MODEL_REPLACEMENTS = {
		"gemini-2.5-flash-lite": "gemini-3.5-flash",
		"models/gemini-2.5-flash-lite": "gemini-3.5-flash",
		"gemini-3.1-flash-lite-preview": "gemini-3.5-flash",
		"models/gemini-3.1-flash-lite-preview": "gemini-3.5-flash",
	};

	function createId() {
		return `provider-${Date.now()}-${Math.random().toString(16).slice(2)}`;
	}

	function getProviderConfig(type) {
		return PROVIDERS[type] || PROVIDERS.gemini;
	}

	function normalizeProfile(profile) {
		const config = getProviderConfig(profile.type);
		const requestedModel = profile.model || config.defaultModel;
		return {
			id: profile.id || createId(),
			type: profile.type || "gemini",
			name: profile.name || config.label,
			apiKey: profile.apiKey || "",
			model: MODEL_REPLACEMENTS[requestedModel] || requestedModel,
			baseUrl: profile.baseUrl || config.baseUrl,
			isDefault: Boolean(profile.isDefault),
		};
	}

	function getStorage(keys) {
		return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
	}

	function setStorage(values) {
		return new Promise((resolve) => chrome.storage.sync.set(values, resolve));
	}

	async function getProfiles() {
		const stored = await getStorage([
			STORAGE_KEYS.profiles,
			STORAGE_KEYS.defaultProfileId,
			STORAGE_KEYS.legacyGeminiKey,
		]);
		const profiles = Array.isArray(stored.providerProfiles)
			? stored.providerProfiles.map(normalizeProfile)
			: [];

		if (profiles.length > 0) {
			const markedProfiles = markDefaultProfile(profiles, stored.defaultProviderId);
			await persistModelMigrations(stored.providerProfiles, markedProfiles, stored.defaultProviderId);
			return markedProfiles;
		}

		if (stored.geminiApiKey) {
			return [
				normalizeProfile({
					id: "legacy-gemini",
					type: "gemini",
					name: "Gemini",
					apiKey: stored.geminiApiKey,
					isDefault: true,
				}),
			];
		}

		return [];
	}

	async function persistModelMigrations(originalProfiles, normalizedProfiles, defaultProfileId) {
		const originalModels = (originalProfiles || []).map((profile) => profile.model || "");
		const migrated = normalizedProfiles.some((profile, index) => profile.model !== originalModels[index]);

		if (migrated) {
			await saveProfiles(normalizedProfiles, defaultProfileId);
		}
	}

	function markDefaultProfile(profiles, defaultProfileId) {
		const hasSelectedDefault = profiles.some((profile) => profile.id === defaultProfileId);
		const fallbackId = profiles[0] && profiles[0].id;

		return profiles.map((profile) => ({
			...profile,
			isDefault: profile.id === (hasSelectedDefault ? defaultProfileId : fallbackId),
		}));
	}

	async function saveProfiles(profiles, defaultProfileId) {
		const normalizedProfiles = profiles.map(normalizeProfile);
		const defaultId = defaultProfileId || normalizedProfiles[0]?.id || "";
		await setStorage({
			[STORAGE_KEYS.profiles]: normalizedProfiles,
			[STORAGE_KEYS.defaultProfileId]: defaultId,
		});
	}

	async function getDefaultProfile() {
		const profiles = await getProfiles();
		return profiles.find((profile) => profile.isDefault) || profiles[0] || null;
	}

	async function summarizeWithProvider(profile, prompt) {
		if (!profile || !profile.apiKey) {
			throw new Error("Add an API key in settings before summarising.");
		}

		if (profile.type === "gemini") {
			return summarizeWithGemini(profile, prompt);
		}

		if (profile.type === "anthropic") {
			return summarizeWithAnthropic(profile, prompt);
		}

		return summarizeWithOpenAiCompatible(profile, prompt);
	}

	async function summarizeWithGemini(profile, prompt) {
		const baseUrl = trimTrailingSlash(profile.baseUrl || PROVIDERS.gemini.baseUrl);
		const url = `${baseUrl}/v1beta/models/${encodeURIComponent(profile.model)}:generateContent?key=${encodeURIComponent(profile.apiKey)}`;
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-goog-api-key": profile.apiKey,
			},
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
				generationConfig: { temperature: 0.2 },
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body.error?.message || "Gemini could not generate a summary.");
		}

		const data = await res.json();
		return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";
	}

	async function summarizeWithOpenAiCompatible(profile, prompt) {
		const config = getProviderConfig(profile.type);
		const baseUrl = trimTrailingSlash(profile.baseUrl || config.baseUrl);

		if (!baseUrl) {
			throw new Error("Add a base URL for this custom provider.");
		}

		const res = await fetch(`${baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${profile.apiKey}`,
			},
			body: JSON.stringify({
				model: profile.model,
				messages: [
					{
						role: "system",
						content: "You summarise content clearly and faithfully.",
					},
					{
						role: "user",
						content: prompt,
					},
				],
				temperature: 0.2,
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body.error?.message || `${config.label} could not generate a summary.`);
		}

		const data = await res.json();
		return data?.choices?.[0]?.message?.content || "No summary generated.";
	}

	async function summarizeWithAnthropic(profile, prompt) {
		const baseUrl = trimTrailingSlash(profile.baseUrl || PROVIDERS.anthropic.baseUrl);
		const res = await fetch(`${baseUrl}/messages`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"anthropic-version": "2023-06-01",
				"anthropic-dangerous-direct-browser-access": "true",
				"x-api-key": profile.apiKey,
			},
			body: JSON.stringify({
				model: profile.model,
				max_tokens: 1200,
				temperature: 0.2,
				messages: [{ role: "user", content: prompt }],
			}),
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body.error?.message || "Anthropic could not generate a summary.");
		}

		const data = await res.json();
		return data?.content?.map((part) => part.text || "").join("").trim() || "No summary generated.";
	}

	function trimTrailingSlash(value) {
		return value.replace(/\/+$/, "");
	}

	window.ProviderRegistry = {
		PROVIDERS,
		createId,
		getProviderConfig,
		normalizeProfile,
		getProfiles,
		saveProfiles,
		getDefaultProfile,
		summarizeWithProvider,
	};
})();
