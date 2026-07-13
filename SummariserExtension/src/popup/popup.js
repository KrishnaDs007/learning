const MIN_TEXT_LENGTH = 40;

const state = {
	lastOutput: "",
	source: null,
	profiles: [],
	history: [],
	uploadedFile: null,
};

const summariseButton = document.getElementById("summarise");
const copyButton = document.getElementById("copy-btn");
const settingsButton = document.getElementById("settings-btn");
const result = document.getElementById("result");
const status = document.getElementById("status");
const sourceLabel = document.getElementById("source-label");
const sourceTypeSelect = document.getElementById("source-type");
const providerSelect = document.getElementById("provider-select");
const outputModeSelect = document.getElementById("output-mode");
const summaryTypeSelect = document.getElementById("summary-type");
const contentTypeSelect = document.getElementById("content-type");
const summaryLengthSelect = document.getElementById("summary-length");
const pastePanel = document.getElementById("paste-panel");
const pasteInput = document.getElementById("paste-input");
const uploadPanel = document.getElementById("upload-panel");
const fileInput = document.getElementById("file-input");
const fileLabel = document.getElementById("file-label");
const historyPanel = document.getElementById("history-panel");
const historyList = document.getElementById("history-list");
const clearHistoryButton = document.getElementById("clear-history-btn");

document.addEventListener("DOMContentLoaded", initialisePopup);
window.addEventListener("unload", notifyPopupClosed);
summariseButton.addEventListener("click", handleRun);
copyButton.addEventListener("click", copyOutput);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
sourceTypeSelect.addEventListener("change", syncSourcePanels);
outputModeSelect.addEventListener("change", syncOutputControls);
fileInput.addEventListener("change", handleFileSelected);
if (clearHistoryButton) {
	clearHistoryButton.addEventListener("click", clearHistory);
}

async function initialisePopup() {
	copyButton.disabled = true;
	chrome.action.setBadgeText({ text: "" });
	await loadProviders();
	await loadHistory();
	renderHistory();
	syncSourcePanels();
	syncOutputControls();

	chrome.storage.local.get(["pendingSummaryText", "pendingSummarySource"], ({ pendingSummaryText, pendingSummarySource }) => {
		if (pendingSummaryText) {
			state.source = pendingSummarySource || { type: "selection" };
			setSourceLabel(state.source);
			setStatus("Selected text is ready. Click Run to continue.");
			return;
		}

		setStatus("Choose a source, provider, and output mode.");
	});
}

async function loadProviders() {
	state.profiles = await ProviderRegistry.getProfiles();
	providerSelect.innerHTML = "";

	if (state.profiles.length === 0) {
		const option = document.createElement("option");
		option.value = "";
		option.textContent = "No provider configured";
		providerSelect.appendChild(option);
		return;
	}

	for (const profile of state.profiles) {
		const config = ProviderRegistry.getProviderConfig(profile.type);
		const option = document.createElement("option");
		option.value = profile.id;
		option.textContent = `${profile.name || config.label} - ${profile.model}`;
		option.selected = profile.isDefault;
		providerSelect.appendChild(option);
	}
}

function syncSourcePanels() {
	const sourceType = sourceTypeSelect.value;
	pastePanel.classList.toggle("hidden", sourceType !== "paste");
	uploadPanel.classList.toggle("hidden", sourceType !== "upload");
}

function syncOutputControls() {
	const isLinksOnly = outputModeSelect.value === "links";
	summaryTypeSelect.disabled = isLinksOnly;
	contentTypeSelect.disabled = isLinksOnly;
	summaryLengthSelect.disabled = isLinksOnly;
	providerSelect.disabled = isLinksOnly;
}

function handleFileSelected() {
	const file = fileInput.files && fileInput.files[0];
	state.uploadedFile = file || null;
	fileLabel.textContent = file ? `${file.name} - ${formatBytes(file.size)}` : "No file selected";
}

async function handleRun() {
	const outputMode = outputModeSelect.value;
	setLoading(outputMode === "links" ? "Extracting links..." : "Preparing summary...");

	try {
		const source = await getSelectedSource(outputMode);
		state.source = source.source;
		setSourceLabel(source.source);

		if (outputMode === "links") {
			const links = source.links && source.links.length > 0 ? source.links : extractLinksFromText(source.text);
			renderLinks(links);
			return;
		}

		const profile = getSelectedProvider();
		if (!profile) {
			setError("Add a provider API key in settings before summarising.");
			chrome.runtime.openOptionsPage();
			return;
		}

		const prompt = SummariserPrompts.buildSummaryPrompt(
			source.text,
			summaryTypeSelect.value,
			summaryLengthSelect.value,
			contentTypeSelect.value,
		);
		const summary = await ProviderRegistry.summarizeWithProvider(profile, prompt);
		state.lastOutput = summary;
		result.textContent = summary;
		copyButton.disabled = false;
		bringResultIntoView();
		setStatus(getSuccessMessage(source.text, profile));
		await saveHistoryItem({
			mode: "summary",
			output: summary,
			source: source.source,
			providerName: profile.name,
		});
	} catch (error) {
		setError(error.message || "Could not complete this request.");
	}
}

function getSelectedProvider() {
	return state.profiles.find((profile) => profile.id === providerSelect.value) || state.profiles[0] || null;
}

async function getSelectedSource(outputMode) {
	const sourceType = sourceTypeSelect.value;

	if (sourceType === "paste") {
		const text = pasteInput.value.trim();
		if (!text) {
			throw new Error("Paste text before running.");
		}
		return {
			text,
			links: extractLinksFromText(text),
			source: { type: "paste", title: "Pasted text", wordCount: countWords(text) },
		};
	}

	if (sourceType === "upload") {
		const text = await UploadReaders.readUploadedFile(state.uploadedFile);
		return {
			text,
			links: extractLinksFromText(text),
			source: {
				type: "upload",
				title: state.uploadedFile.name,
				wordCount: countWords(text),
			},
		};
	}

	return getPageSource(outputMode);
}

async function getPageSource(outputMode) {
	const pending = await getPendingSource();
	if (pending && outputMode !== "links") {
		return pending;
	}

	const tabs = await queryActiveTab();
	const tab = tabs[0];
	const messageType = outputMode === "links" ? "GET_PAGE_LINKS" : "GET_ARTICLE_TEXT";
	const response = await requestPageData(tab.id, messageType);

	if (outputMode === "links") {
		return {
			text: "",
			links: response.links || [],
			source: response.source || { type: "page" },
		};
	}

	if (!hasExtractedText(response)) {
		throw new Error("I could not find enough readable text on this page.");
	}

	return {
		text: response.text,
		links: response.links || [],
		source: response.source || { type: "page" },
	};
}

function getPendingSource() {
	return new Promise((resolve) => {
		chrome.storage.local.get(["pendingSummaryText", "pendingSummarySource"], ({ pendingSummaryText, pendingSummarySource }) => {
			if (!pendingSummaryText) {
				resolve(null);
				return;
			}

			chrome.storage.local.remove(["pendingSummaryText", "pendingSummarySource"]);
			resolve({
				text: pendingSummaryText,
				links: extractLinksFromText(pendingSummaryText),
				source: pendingSummarySource || { type: "selection" },
			});
		});
	});
}

function queryActiveTab() {
	return new Promise((resolve, reject) => {
		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs || tabs.length === 0 || !tabs[0].id) {
				reject(new Error("No active tab found."));
				return;
			}
			resolve(tabs);
		});
	});
}

function requestPageData(tabId, messageType) {
	return new Promise((resolve, reject) => {
		chrome.tabs.sendMessage(tabId, { type: messageType }, (response) => {
			if (!chrome.runtime.lastError) {
				resolve(response);
				return;
			}

			setStatus("Preparing this page...");
			chrome.scripting
				.executeScript({
					target: { tabId },
					files: ["src/content/content.js"],
				})
				.then(() => {
					chrome.tabs.sendMessage(tabId, { type: messageType }, (retryResponse) => {
						if (chrome.runtime.lastError) {
							reject(new Error("This page cannot be read. Try selected text, pasted text, or a text file."));
							return;
						}

						resolve(retryResponse);
					});
				})
				.catch(() => {
					reject(new Error("Chrome blocked access to this page. Try selected text, pasted text, or a text file."));
				});
		});
	});
}

function hasExtractedText(response) {
	const text = response && response.text;
	return Boolean(text && text.trim().length >= MIN_TEXT_LENGTH);
}

async function loadHistory() {
	state.history = await PopupHistoryStore.load();
}

function saveHistoryItem(item) {
	state.history = PopupHistoryStore.prepend(state.history, item);
	renderHistory();
	return PopupHistoryStore.save(state.history);
}

function renderHistory() {
	historyPanel.classList.toggle("hidden", state.history.length === 0);
	historyList.innerHTML = "";

	for (const item of state.history) {
		const button = document.createElement("button");
		button.className = "history-item";
		button.type = "button";
		button.innerHTML = `
			<strong>${escapeHtml(item.sourceTitle)}</strong>
			<span>${escapeHtml(PopupHistoryStore.getMeta(item))}</span>
		`;
		button.addEventListener("click", () => restoreHistoryItem(item));
		historyList.appendChild(button);
	}
}

function restoreHistoryItem(item) {
	state.lastOutput = item.output;
	result.textContent = item.output;
	copyButton.disabled = false;
	bringResultIntoView();
	setStatus(`Restored ${item.mode === "links" ? "links" : "summary"} from recent history.`);
}

function clearHistory() {
	state.history = [];
	renderHistory();
	PopupHistoryStore.clear();
	setStatus("Recent history cleared.");
}
function renderLinks(links) {
	const uniqueLinks = dedupeLinks(links);
	if (uniqueLinks.length === 0) {
		state.lastOutput = "";
		copyButton.disabled = true;
		setError("No links were found in this source.");
		return;
	}

	state.lastOutput = uniqueLinks.map((link) => {
		const label = link.text ? `${link.text} - ` : "";
		return `${label}${link.url}`;
	}).join("\n");
	result.textContent = state.lastOutput;
	copyButton.disabled = false;
	bringResultIntoView();
	setStatus(`${uniqueLinks.length} link${uniqueLinks.length === 1 ? "" : "s"} extracted.`);
	saveHistoryItem({
		mode: "links",
		output: state.lastOutput,
		source: state.source,
		providerName: "Links only",
	});
}

function extractLinksFromText(text) {
	const matches = text.match(/https?:\/\/[^\s<>"')]+/g) || [];
	return matches.map((url) => ({ text: "", url }));
}

function dedupeLinks(links) {
	const seen = new Set();
	return links
		.filter((link) => link && link.url)
		.map((link) => ({
			text: (link.text || "").trim(),
			url: link.url.trim(),
		}))
		.filter((link) => {
			if (seen.has(link.url)) {
				return false;
			}
			seen.add(link.url);
			return true;
		});
}

async function copyOutput() {
	if (!state.lastOutput) {
		return;
	}

	try {
		await navigator.clipboard.writeText(state.lastOutput);
		const originalText = copyButton.textContent;
		copyButton.textContent = "Copied";
		setTimeout(() => {
			copyButton.textContent = originalText;
		}, 1400);
	} catch (error) {
		setError("Could not copy the output. Select the text and copy it manually.");
	}
}

function notifyPopupClosed() {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		const tabId = tabs && tabs[0] && tabs[0].id;
		if (!tabId) {
			return;
		}

		chrome.tabs.sendMessage(tabId, { type: "SUMMARISER_POPUP_CLOSED" }, () => {
			void chrome.runtime.lastError;
		});
	});
}

function setLoading(message) {
	summariseButton.disabled = true;
	copyButton.disabled = true;
	status.classList.remove("error");
	status.textContent = message;
	result.innerHTML = `
		<div class="loading">
			<div class="loader"></div>
			<span>${escapeHtml(message)}</span>
		</div>
	`;
	bringResultIntoView();
}

function setStatus(message) {
	summariseButton.disabled = false;
	status.classList.remove("error");
	status.textContent = message;
}

function setError(message) {
	summariseButton.disabled = false;
	copyButton.disabled = !state.lastOutput;
	status.classList.add("error");
	status.textContent = message;
	result.innerHTML = `
		<div class="empty-state">
			<strong>Could not complete request</strong>
			<span>${escapeHtml(message)}</span>
		</div>
	`;
	bringResultIntoView();
}

function bringResultIntoView() {
	requestAnimationFrame(() => {
		result.scrollIntoView({ block: "nearest", behavior: "smooth" });
	});
}

function setSourceLabel(source) {
	if (!source) {
		sourceLabel.textContent = "Ready to summarise this page";
		return;
	}

	if (source.type === "selection") {
		sourceLabel.textContent = "Selected text";
		return;
	}

	if (source.type === "paste" || source.type === "upload") {
		sourceLabel.textContent = `${source.title || "Custom source"}${source.wordCount ? ` - ${source.wordCount} words` : ""}`;
		return;
	}

	const domain = source.domain || "current page";
	const words = source.wordCount ? ` - ${source.wordCount} words` : "";
	sourceLabel.textContent = `${domain}${words}`;
}

function getSuccessMessage(text, profile) {
	const words = countWords(text);
	const sourceType = state.source && state.source.type ? state.source.type : "page";
	return `Summary ready from ${sourceType} content - ${words} words read with ${profile.name}.`;
}

function countWords(text) {
	return text.split(/\s+/).filter(Boolean).length;
}

function formatBytes(bytes) {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${Math.round(bytes / 1024)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
