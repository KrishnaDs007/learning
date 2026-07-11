const profileSelect = document.getElementById("profile-select");
const providerTypeSelect = document.getElementById("provider-type");
const profileNameInput = document.getElementById("profile-name");
const modelNameInput = document.getElementById("model-name");
const apiKeyInput = document.getElementById("api-key");
const baseUrlInput = document.getElementById("base-url");
const defaultProviderInput = document.getElementById("default-provider");
const providerHelp = document.getElementById("provider-help");
const newButton = document.getElementById("new-btn");
const saveButton = document.getElementById("save-btn");
const deleteButton = document.getElementById("delete-btn");
const toggleKeyButton = document.getElementById("toggle-key-btn");
const statusMessage = document.getElementById("status-message");

let profiles = [];
let editingProfileId = "";

document.addEventListener("DOMContentLoaded", initialiseOptions);
profileSelect.addEventListener("change", () => selectProfile(profileSelect.value));
providerTypeSelect.addEventListener("change", syncProviderDefaults);
newButton.addEventListener("click", startNewProfile);
saveButton.addEventListener("click", saveProfile);
deleteButton.addEventListener("click", deleteProfile);
toggleKeyButton.addEventListener("click", toggleKeyVisibility);

async function initialiseOptions() {
	populateProviderTypes();
	profiles = await ProviderRegistry.getProfiles();
	renderProfileSelect();

	if (profiles.length > 0) {
		selectProfile(profiles.find((profile) => profile.isDefault)?.id || profiles[0].id);
	} else {
		startNewProfile();
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

function renderProfileSelect() {
	profileSelect.innerHTML = "";

	if (profiles.length === 0) {
		const option = document.createElement("option");
		option.value = "";
		option.textContent = "No providers saved";
		profileSelect.appendChild(option);
		return;
	}

	profiles.forEach((profile) => {
		const option = document.createElement("option");
		option.value = profile.id;
		option.textContent = `${profile.name}${profile.isDefault ? " (default)" : ""}`;
		profileSelect.appendChild(option);
	});
}

function selectProfile(profileId) {
	const profile = profiles.find((item) => item.id === profileId);
	if (!profile) {
		startNewProfile();
		return;
	}

	editingProfileId = profile.id;
	profileSelect.value = profile.id;
	providerTypeSelect.value = profile.type;
	profileNameInput.value = profile.name || "";
	modelNameInput.value = profile.model || "";
	apiKeyInput.value = profile.apiKey || "";
	baseUrlInput.value = profile.baseUrl || "";
	defaultProviderInput.checked = Boolean(profile.isDefault);
	syncProviderHelp();
	setStatus("Provider loaded.");
}

function startNewProfile() {
	editingProfileId = "";
	providerTypeSelect.value = "gemini";
	syncProviderDefaults();
	apiKeyInput.value = "";
	defaultProviderInput.checked = profiles.length === 0;
	setStatus("Create a new provider profile.");
}

function syncProviderDefaults() {
	const config = ProviderRegistry.getProviderConfig(providerTypeSelect.value);
	if (!editingProfileId) {
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
	renderProfileSelect();
	selectProfile(profile.id);
	setStatus("Provider saved.");
}

async function deleteProfile() {
	if (!editingProfileId) {
		setStatus("No saved provider selected.", true);
		return;
	}

	profiles = profiles.filter((profile) => profile.id !== editingProfileId);
	const defaultId = profiles[0]?.id || "";
	profiles = profiles.map((profile, index) => ({
		...profile,
		isDefault: index === 0,
	}));

	await ProviderRegistry.saveProfiles(profiles, defaultId);
	renderProfileSelect();

	if (profiles.length > 0) {
		selectProfile(profiles[0].id);
	} else {
		startNewProfile();
	}

	setStatus("Provider deleted.");
}

function toggleKeyVisibility() {
	const isPassword = apiKeyInput.type === "password";
	apiKeyInput.type = isPassword ? "text" : "password";
	toggleKeyButton.textContent = isPassword ? "Hide" : "Show";
}

function setStatus(message, isError = false) {
	statusMessage.textContent = message;
	statusMessage.classList.toggle("error", isError);
}

