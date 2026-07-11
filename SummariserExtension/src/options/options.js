const apiKeyInput = document.getElementById("api-key");
const saveButton = document.getElementById("save-btn");
const clearButton = document.getElementById("clear-btn");
const toggleKeyButton = document.getElementById("toggle-key-btn");
const statusMessage = document.getElementById("status-message");

document.addEventListener("DOMContentLoaded", loadSettings);
saveButton.addEventListener("click", saveSettings);
clearButton.addEventListener("click", clearSettings);
toggleKeyButton.addEventListener("click", toggleKeyVisibility);

function loadSettings() {
	chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
		apiKeyInput.value = geminiApiKey || "";
		setStatus(geminiApiKey ? "API key is saved." : "No API key saved yet.");
	});
}

function saveSettings() {
	const apiKey = apiKeyInput.value.trim();

	if (!apiKey) {
		setStatus("Enter a Gemini API key before saving.", true);
		return;
	}

	chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
		setStatus("Settings saved successfully.");
	});
}

function clearSettings() {
	chrome.storage.sync.remove("geminiApiKey", () => {
		apiKeyInput.value = "";
		setStatus("API key removed.");
	});
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

