const MIN_TEXT_LENGTH = 40;
const SUPPORTED_TEXT_FILE_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".htm"];

const state = {
	lastOutput: "",
	source: null,
	profiles: [],
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
const summaryLengthSelect = document.getElementById("summary-length");
const pastePanel = document.getElementById("paste-panel");
const pasteInput = document.getElementById("paste-input");
const uploadPanel = document.getElementById("upload-panel");
const fileInput = document.getElementById("file-input");
const fileLabel = document.getElementById("file-label");

document.addEventListener("DOMContentLoaded", initialisePopup);
summariseButton.addEventListener("click", handleRun);
copyButton.addEventListener("click", copyOutput);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
sourceTypeSelect.addEventListener("change", syncSourcePanels);
outputModeSelect.addEventListener("change", syncOutputControls);
fileInput.addEventListener("change", handleFileSelected);

async function initialisePopup() {
	copyButton.disabled = true;
	chrome.action.setBadgeText({ text: "" });
	await loadProviders();
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
		option.textContent = `${profile.name || config.label} · ${profile.model}`;
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
	summaryLengthSelect.disabled = isLinksOnly;
	providerSelect.disabled = isLinksOnly;
}

function handleFileSelected() {
	const file = fileInput.files && fileInput.files[0];
	state.uploadedFile = file || null;
	fileLabel.textContent = file ? `${file.name} · ${formatBytes(file.size)}` : "No file selected";
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
		);
		const summary = await ProviderRegistry.summarizeWithProvider(profile, prompt);
		state.lastOutput = summary;
		result.textContent = summary;
		copyButton.disabled = false;
		setStatus(getSuccessMessage(source.text, profile));
	} catch (error) {
		console.error("Run failed:", error);
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
		const text = await readUploadedTextFile();
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

function readUploadedTextFile() {
	return new Promise((resolve, reject) => {
		const file = state.uploadedFile;
		if (!file) {
			reject(new Error("Choose a file before running."));
			return;
		}

		const lowerName = file.name.toLowerCase();
		const isSupported = SUPPORTED_TEXT_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
		if (!isSupported) {
			reject(new Error("This upload type is planned, but only text-based files are supported right now."));
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			const text = String(reader.result || "").trim();
			if (!text) {
				reject(new Error("The selected file does not contain readable text."));
				return;
			}
			resolve(text);
		};
		reader.onerror = () => reject(new Error("Could not read the selected file."));
		reader.readAsText(file);
	});
}

function hasExtractedText(response) {
	const text = response && response.text;
	return Boolean(text && text.trim().length >= MIN_TEXT_LENGTH);
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
	setStatus(`${uniqueLinks.length} link${uniqueLinks.length === 1 ? "" : "s"} extracted.`);
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

