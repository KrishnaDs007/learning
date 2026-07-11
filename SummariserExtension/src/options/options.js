const providerList = document.getElementById("provider-list");
const providerModal = document.getElementById("provider-modal");
const modalTitle = document.getElementById("modal-title");
const providerTypeSelect = document.getElementById("provider-type");
const profileNameInput = document.getElementById("profile-name");
const modelNameInput = document.getElementById("model-name");
const apiKeyInput = document.getElementById("api-key");
const baseUrlInput = document.getElementById("base-url");
const defaultProviderInput = document.getElementById("default-provider");
const providerHelp = document.getElementById("provider-help");
const apiGuideSteps = document.getElementById("api-guide-steps");
const apiGuideLink = document.getElementById("api-guide-link");
const newButton = document.getElementById("new-btn");
const closeWindowButton = document.getElementById("close-window-btn");
const saveButton = document.getElementById("save-btn");
const deleteButton = document.getElementById("delete-btn");
const cancelButton = document.getElementById("cancel-btn");
const closeModalButton = document.getElementById("close-modal-btn");
const toggleKeyButton = document.getElementById("toggle-key-btn");
const autoCloseBanner = document.getElementById("auto-close-banner");
const autoCloseMessage = document.getElementById("auto-close-message");
const cancelAutoCloseButton = document.getElementById("cancel-auto-close-btn");
const statusMessage = document.getElementById("status-message");

let profiles = [];
let editingProfileId = "";
let expandedProfileIds = new Set();
let autoCloseTimerId = 0;
let autoCloseIntervalId = 0;
let statusHideTimerId = 0;

const API_KEY_GUIDES = {
	gemini: {
		url: "https://aistudio.google.com/app/apikey",
		linkLabel: "Open Google AI Studio",
		steps: [
			"Open Google AI Studio and sign in with your Google account.",
			"Create an API key from the API keys page.",
			"Copy the key, paste it here, then keep the default Gemini model unless you need another one.",
		],
	},
	openai: {
		url: "https://platform.openai.com/api-keys",
		linkLabel: "Open OpenAI API keys",
		steps: [
			"Open the OpenAI platform and sign in to the workspace you want to bill from.",
			"Create a new secret key on the API keys page.",
			"Copy the key once, paste it here, and use an OpenAI chat model such as gpt-4.1-mini.",
		],
	},
	anthropic: {
		url: "https://platform.claude.com/settings/keys",
		linkLabel: "Open Anthropic Console",
		steps: [
			"Open Anthropic Console and sign in to the workspace you want to use.",
			"Create an API key from Settings, then API keys.",
			"Copy the key, paste it here, and keep a Claude model name in the model field.",
		],
	},
	grok: {
		url: "https://console.x.ai/",
		linkLabel: "Open xAI Console",
		steps: [
			"Open the xAI Console and sign in.",
			"Create an API key from the console API key area.",
			"Copy the key, paste it here, and use a Grok model supported by your account.",
		],
	},
	custom: {
		url: "",
		linkLabel: "",
		steps: [
			"Open your provider dashboard or self-hosted gateway.",
			"Create an API key with chat completions access.",
			"Paste the key here, then enter the provider's OpenAI-compatible base URL and model name.",
		],
	},
};

document.addEventListener("DOMContentLoaded", initialiseOptions);
providerTypeSelect.addEventListener("change", syncProviderDefaults);
newButton.addEventListener("click", () => openProviderModal());
closeWindowButton.addEventListener("click", closeSettingsWindow);
saveButton.addEventListener("click", saveProfile);
deleteButton.addEventListener("click", deleteProfile);
cancelButton.addEventListener("click", closeProviderModal);
closeModalButton.addEventListener("click", closeProviderModal);
toggleKeyButton.addEventListener("click", toggleKeyVisibility);
cancelAutoCloseButton.addEventListener("click", cancelAutoClose);
providerModal.addEventListener("click", (event) => {
	if (event.target.hasAttribute("data-close-modal")) {
		closeProviderModal();
	}
});

async function initialiseOptions() {
	populateProviderTypes();
	profiles = await ProviderRegistry.getProfiles();
	expandedProfileIds = new Set(
		profiles.filter((profile) => profile.isDefault).map((profile) => profile.id),
	);
	renderProviderList();

	if (profiles.length === 0) {
		setStatus("No providers saved yet. Add your first provider to start summarising.");
	} else {
		setStatus("Provider settings loaded.");
	}
}

function populateProviderTypes() {
	providerTypeSelect.innerHTML = "";
	Object.entries(ProviderRegistry.PROVIDERS).forEach(([type, config]) => {
		const option = document.createElement("option");
		option.value = type;
		option.textContent = config.label;
		providerTypeSelect.appendChild(option);
	});
}

function renderProviderList() {
	providerList.innerHTML = "";

	if (profiles.length === 0) {
		providerList.innerHTML = `
			<div class="empty-provider-list">
				<strong>No providers yet</strong>
				<span>Add Gemini, OpenAI, Anthropic, Grok, or a custom compatible provider.</span>
			</div>
		`;
		return;
	}

	for (const profile of profiles) {
		providerList.appendChild(createProviderCard(profile));
	}
}

function createProviderCard(profile) {
	const config = ProviderRegistry.getProviderConfig(profile.type);
	const card = document.createElement("article");
	const isExpanded = profile.isDefault || expandedProfileIds.has(profile.id);
	card.className = "provider-card";
	card.dataset.profileId = profile.id;

	card.innerHTML = `
		<button class="provider-summary" type="button" aria-expanded="${isExpanded}">
			<span class="provider-title">
				<strong>${escapeHtml(profile.name || config.label)}</strong>
				<span>${escapeHtml(config.label)} - ${escapeHtml(profile.model || config.defaultModel)}</span>
			</span>
			<span class="provider-meta">
				${profile.isDefault ? '<span class="default-badge">Default</span>' : ""}
				<span class="chevron">${isExpanded ? "Hide" : "Show"}</span>
			</span>
		</button>
		<div class="provider-details ${isExpanded ? "" : "hidden"}">
			<dl>
				<div>
					<dt>Model</dt>
					<dd>${escapeHtml(profile.model || config.defaultModel)}</dd>
				</div>
				<div>
					<dt>Base URL</dt>
					<dd>${escapeHtml(profile.baseUrl || config.baseUrl || "Not set")}</dd>
				</div>
				<div>
					<dt>API key</dt>
					<dd>${profile.apiKey ? "Saved" : "Missing"}</dd>
				</div>
			</dl>
			<div class="card-actions">
				<button class="secondary-button edit-provider" type="button">Edit</button>
				${profile.isDefault ? "" : '<button class="secondary-button make-default" type="button">Make default</button>'}
			</div>
		</div>
	`;

	card.querySelector(".provider-summary").addEventListener("click", () => {
		toggleProviderCard(profile.id);
	});
	card.querySelector(".edit-provider").addEventListener("click", () => {
		openProviderModal(profile.id);
	});
	const makeDefaultButton = card.querySelector(".make-default");
	if (makeDefaultButton) {
		makeDefaultButton.addEventListener("click", () => makeDefaultProvider(profile.id));
	}

	return card;
}

function toggleProviderCard(profileId) {
	if (expandedProfileIds.has(profileId)) {
		const profile = profiles.find((item) => item.id === profileId);
		if (!profile?.isDefault) {
			expandedProfileIds.delete(profileId);
		}
	} else {
		expandedProfileIds.add(profileId);
	}

	renderProviderList();
}

function openProviderModal(profileId = "") {
	cancelAutoClose();
	const profile = profiles.find((item) => item.id === profileId);
	editingProfileId = profile ? profile.id : "";
	modalTitle.textContent = profile ? "Edit provider" : "New provider";
	deleteButton.classList.toggle("hidden", !profile);

	if (profile) {
		providerTypeSelect.value = profile.type;
		profileNameInput.value = profile.name || "";
		modelNameInput.value = profile.model || "";
		apiKeyInput.value = profile.apiKey || "";
		baseUrlInput.value = profile.baseUrl || "";
		defaultProviderInput.checked = Boolean(profile.isDefault);
	} else {
		providerTypeSelect.value = "gemini";
		defaultProviderInput.checked = profiles.length === 0;
		apiKeyInput.value = "";
		syncProviderDefaults(true);
	}

	apiKeyInput.type = "password";
	toggleKeyButton.textContent = "Show";
	syncProviderHelp();
	providerModal.classList.remove("hidden");
	providerModal.setAttribute("aria-hidden", "false");
	profileNameInput.focus();
}

function closeProviderModal() {
	providerModal.classList.add("hidden");
	providerModal.setAttribute("aria-hidden", "true");
	editingProfileId = "";
}

function syncProviderDefaults(force = false) {
	const config = ProviderRegistry.getProviderConfig(providerTypeSelect.value);
	if (force || !editingProfileId) {
		profileNameInput.value = config.label;
		modelNameInput.value = config.defaultModel;
		baseUrlInput.value = config.baseUrl;
	}
	syncProviderHelp();
}

function syncProviderHelp() {
	const config = ProviderRegistry.getProviderConfig(providerTypeSelect.value);
	const baseUrlMessage = config.requiresBaseUrl
		? "A base URL is required for custom OpenAI-compatible providers."
		: `Default base URL: ${config.baseUrl}`;
	providerHelp.textContent = `${config.label} default model: ${config.defaultModel}. ${baseUrlMessage}`;
	renderApiKeyGuide(providerTypeSelect.value);
}

function renderApiKeyGuide(providerType) {
	const guide = API_KEY_GUIDES[providerType] || API_KEY_GUIDES.gemini;
	apiGuideSteps.innerHTML = "";

	for (const step of guide.steps) {
		const item = document.createElement("li");
		item.textContent = step;
		apiGuideSteps.appendChild(item);
	}

	if (guide.url) {
		apiGuideLink.href = guide.url;
		apiGuideLink.textContent = guide.linkLabel;
		apiGuideLink.classList.remove("hidden");
	} else {
		apiGuideLink.removeAttribute("href");
		apiGuideLink.textContent = "";
		apiGuideLink.classList.add("hidden");
	}
}

async function saveProfile() {
	const profile = ProviderRegistry.normalizeProfile({
		id: editingProfileId || ProviderRegistry.createId(),
		type: providerTypeSelect.value,
		name: profileNameInput.value.trim(),
		model: modelNameInput.value.trim(),
		apiKey: apiKeyInput.value.trim(),
		baseUrl: baseUrlInput.value.trim(),
	});

	if (!profile.apiKey) {
		setStatus("Enter an API key before saving.", true);
		return;
	}

	if (ProviderRegistry.getProviderConfig(profile.type).requiresBaseUrl && !profile.baseUrl) {
		setStatus("Enter a base URL for this custom provider.", true);
		return;
	}

	const existingIndex = profiles.findIndex((item) => item.id === profile.id);
	if (existingIndex >= 0) {
		profiles[existingIndex] = profile;
	} else {
		profiles.push(profile);
	}

	const defaultId = defaultProviderInput.checked
		? profile.id
		: profiles.find((item) => item.isDefault)?.id || profiles[0].id;

	profiles = profiles.map((item) => ({
		...item,
		isDefault: item.id === defaultId,
	}));

	await ProviderRegistry.saveProfiles(profiles, defaultId);
	expandedProfileIds = new Set([defaultId, profile.id]);
	renderProviderList();
	closeProviderModal();
	setStatus("Provider saved.");
	startAutoClose();
}

async function makeDefaultProvider(profileId) {
	profiles = profiles.map((profile) => ({
		...profile,
		isDefault: profile.id === profileId,
	}));

	await ProviderRegistry.saveProfiles(profiles, profileId);
	expandedProfileIds = new Set([profileId]);
	renderProviderList();
	setStatus("Default provider updated.");
	startAutoClose();
}

async function deleteProfile() {
	if (!editingProfileId) {
		setStatus("No saved provider selected.", true);
		return;
	}

	profiles = profiles.filter((profile) => profile.id !== editingProfileId);
	const defaultId = profiles.find((profile) => profile.isDefault)?.id || profiles[0]?.id || "";
	profiles = profiles.map((profile) => ({
		...profile,
		isDefault: profile.id === defaultId,
	}));

	await ProviderRegistry.saveProfiles(profiles, defaultId);
	expandedProfileIds = defaultId ? new Set([defaultId]) : new Set();
	renderProviderList();
	closeProviderModal();
	setStatus("Provider deleted.");
}

function toggleKeyVisibility() {
	const isPassword = apiKeyInput.type === "password";
	apiKeyInput.type = isPassword ? "text" : "password";
	toggleKeyButton.textContent = isPassword ? "Hide" : "Show";
}

function startAutoClose() {
	let secondsRemaining = 5;
	clearAutoCloseTimers();
	autoCloseBanner.classList.remove("hidden");
	updateAutoCloseMessage(secondsRemaining);

	autoCloseIntervalId = window.setInterval(() => {
		secondsRemaining -= 1;
		updateAutoCloseMessage(secondsRemaining);
	}, 1000);
	autoCloseTimerId = window.setTimeout(() => closeSettingsWindow("Settings saved. You can close this tab when ready."), secondsRemaining * 1000);
}

function cancelAutoClose() {
	clearAutoCloseTimers();
	autoCloseBanner.classList.add("hidden");
}

function clearAutoCloseTimers() {
	if (autoCloseTimerId) {
		window.clearTimeout(autoCloseTimerId);
		autoCloseTimerId = 0;
	}

	if (autoCloseIntervalId) {
		window.clearInterval(autoCloseIntervalId);
		autoCloseIntervalId = 0;
	}
}

function updateAutoCloseMessage(secondsRemaining) {
	const safeSeconds = Math.max(secondsRemaining, 1);
	autoCloseMessage.textContent = `Settings saved. Closing this window in ${safeSeconds} second${safeSeconds === 1 ? "" : "s"}.`;
}

function closeSettingsWindow(blockedMessage = "You can close this tab when ready.") {
	clearAutoCloseTimers();
	window.close();

	window.setTimeout(() => {
		autoCloseBanner.classList.add("hidden");
		setStatus(blockedMessage);
	}, 150);
}

function setStatus(message, isError = false) {
	clearStatusHideTimer();
	statusMessage.textContent = message;
	statusMessage.classList.toggle("error", isError);

	if (!message || isError) {
		return;
	}

	const hideDelay = getStatusHideDelay(message);
	statusHideTimerId = window.setTimeout(() => {
		statusMessage.textContent = "";
	}, hideDelay);
}

function getStatusHideDelay(message) {
	const baseDelay = 3000;
	const extraDelay = Math.min(String(message).length * 35, 2000);
	return baseDelay + extraDelay;
}

function clearStatusHideTimer() {
	if (statusHideTimerId) {
		window.clearTimeout(statusHideTimerId);
		statusHideTimerId = 0;
	}
}

function escapeHtml(value) {
	return String(value).replace(/[&<>"']/g, (character) => {
		const entities = {
			"&": "&amp;",
			"<": "&lt;",
			">": "&gt;",
			'"': "&quot;",
			"'": "&#039;",
		};
		return entities[character];
	});
}
