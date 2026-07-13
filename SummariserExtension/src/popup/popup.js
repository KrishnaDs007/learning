const MIN_TEXT_LENGTH = 40;
const HISTORY_STORAGE_KEY = "summaryHistory";
const MAX_HISTORY_ITEMS = 5;
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const SUPPORTED_TEXT_FILE_EXTENSIONS = [".txt", ".md", ".csv", ".json", ".html", ".htm"];
const SUPPORTED_PDF_FILE_EXTENSIONS = [".pdf"];
const SUPPORTED_DOCX_FILE_EXTENSIONS = [".docx"];
const SUPPORTED_DOC_FILE_EXTENSIONS = [".doc"];

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
		);
		const summary = await ProviderRegistry.summarizeWithProvider(profile, prompt);
		state.lastOutput = summary;
		result.textContent = summary;
		copyButton.disabled = false;
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
		const text = await readUploadedFile();
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

function readUploadedFile() {
	return new Promise((resolve, reject) => {
		const file = state.uploadedFile;
		if (!file) {
			reject(new Error("Choose a file before running."));
			return;
		}

		if (file.size === 0) {
			reject(new Error("The selected file is empty."));
			return;
		}

		if (file.size > MAX_UPLOAD_BYTES) {
			reject(new Error("This file is too large for browser-side summarising. Try a smaller file or paste the most relevant text."));
			return;
		}

		const lowerName = file.name.toLowerCase();
		if (SUPPORTED_PDF_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
			readFileAsArrayBuffer(file)
				.then((buffer) => resolve(extractTextFromPdf(buffer)))
				.catch((error) => reject(error));
			return;
		}

		if (SUPPORTED_DOCX_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
			readFileAsArrayBuffer(file)
				.then((buffer) => extractTextFromDocx(buffer))
				.then((text) => resolve(text))
				.catch((error) => reject(error));
			return;
		}

		if (SUPPORTED_DOC_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
			readFileAsArrayBuffer(file)
				.then((buffer) => resolve(extractTextFromLegacyDoc(buffer)))
				.catch((error) => reject(error));
			return;
		}

		const isSupported = SUPPORTED_TEXT_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
		if (!isSupported) {
			reject(new Error("This upload type is planned, but only text-based files, PDFs, and DOCX files are supported right now."));
			return;
		}

		readFileAsText(file)
			.then((text) => resolve(text))
			.catch((error) => reject(error));
	});
}

function readFileAsText(file) {
	return new Promise((resolve, reject) => {
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

function readFileAsArrayBuffer(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(new Error("Could not read the selected file."));
		reader.readAsArrayBuffer(file);
	});
}

function extractTextFromPdf(buffer) {
	if (!buffer || buffer.byteLength === 0) {
		throw new Error("The selected PDF is empty.");
	}

	const bytes = new Uint8Array(buffer);
	if (bytesToBinaryString(bytes.slice(0, 8)).indexOf("%PDF-") !== 0) {
		throw new Error("This file does not look like a valid PDF.");
	}

	const pdfText = bytesToBinaryString(bytes);
	const streamTexts = Array.from(pdfText.matchAll(/stream\r?\n?([\s\S]*?)\r?\n?endstream/g))
		.map((match) => extractPdfTextObjects(match[1]))
		.filter(Boolean);
	const text = cleanPdfText(streamTexts.join("\n\n"));

	if (!text) {
		throw new Error("No readable PDF text found. Scanned or image-only PDFs need OCR, which is not supported yet.");
	}

	return text;
}

function bytesToBinaryString(bytes) {
	let output = "";
	const chunkSize = 8192;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		output += String.fromCharCode(...bytes.slice(index, index + chunkSize));
	}
	return output;
}

function extractPdfTextObjects(stream) {
	return Array.from(stream.matchAll(/BT([\s\S]*?)ET/g))
		.map((match) => extractPdfStrings(match[1]))
		.flat()
		.join(" ");
}

function extractPdfStrings(textObject) {
	const literalStrings = Array.from(textObject.matchAll(/\((?:\\.|[^\\)])*\)/g))
		.map((match) => decodePdfLiteralString(match[0].slice(1, -1)));
	const hexStrings = Array.from(textObject.matchAll(/<([0-9A-Fa-f\s]{4,})>/g))
		.map((match) => decodePdfHexString(match[1]));
	return [...literalStrings, ...hexStrings].filter(Boolean);
}

function decodePdfLiteralString(value) {
	return value
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\r")
		.replace(/\\t/g, "\t")
		.replace(/\\b/g, "\b")
		.replace(/\\f/g, "\f")
		.replace(/\\([()\\])/g, "$1")
		.replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));
}

function decodePdfHexString(value) {
	const hex = value.replace(/\s+/g, "");
	let output = "";
	for (let index = 0; index < hex.length - 1; index += 2) {
		const code = parseInt(hex.slice(index, index + 2), 16);
		if (Number.isFinite(code) && code > 0) {
			output += String.fromCharCode(code);
		}
	}
	return output;
}

function cleanPdfText(text) {
	return text
		.replace(/\u0000/g, "")
		.replace(/[ \t]+/g, " ")
		.replace(/\s+([,.;:!?])/g, "$1")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
async function extractTextFromDocx(buffer) {
	if (!buffer || buffer.byteLength === 0) {
		throw new Error("The selected DOCX file is empty.");
	}

	const entries = getZipEntries(buffer);
	const documentEntry = entries.find((entry) => entry.name === "word/document.xml");
	if (!documentEntry) {
		throw new Error("This DOCX file does not contain a readable document body.");
	}

	const xmlBytes = await readZipEntry(buffer, documentEntry);
	const xml = new TextDecoder("utf-8").decode(xmlBytes);
	const text = extractTextFromDocxXml(xml);
	if (!text) {
		throw new Error("No readable DOCX text found.");
	}
	return text;
}

function getZipEntries(buffer) {
	if (!buffer || buffer.byteLength < 22) {
		throw new Error("This document archive is empty or incomplete.");
	}

	const view = new DataView(buffer);
	const eocdOffset = findEndOfCentralDirectory(view);
	if (eocdOffset < 0) {
		throw new Error("This DOCX file could not be read as a valid document archive.");
	}

	const entryCount = view.getUint16(eocdOffset + 10, true);
	const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
	const entries = [];
	let offset = centralDirectoryOffset;

	for (let index = 0; index < entryCount; index += 1) {
		if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
			break;
		}

		const compressionMethod = view.getUint16(offset + 10, true);
		const compressedSize = view.getUint32(offset + 20, true);
		const uncompressedSize = view.getUint32(offset + 24, true);
		const fileNameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const localHeaderOffset = view.getUint32(offset + 42, true);
		if (offset + 46 + fileNameLength + extraLength + commentLength > view.byteLength) {
			throw new Error("This DOCX file appears to be corrupt or incomplete.");
		}

		const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
		const name = new TextDecoder("utf-8").decode(nameBytes);

		entries.push({
			name,
			compressionMethod,
			compressedSize,
			uncompressedSize,
			localHeaderOffset,
		});

		offset += 46 + fileNameLength + extraLength + commentLength;
	}

	return entries;
}

function findEndOfCentralDirectory(view) {
	const minOffset = Math.max(0, view.byteLength - 0xffff - 22);
	for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
		if (view.getUint32(offset, true) === 0x06054b50) {
			return offset;
		}
	}
	return -1;
}

async function readZipEntry(buffer, entry) {
	const view = new DataView(buffer);
	const offset = entry.localHeaderOffset;
	if (offset + 30 > view.byteLength || view.getUint32(offset, true) !== 0x04034b50) {
		throw new Error("This DOCX file has an invalid local file header.");
	}

	const fileNameLength = view.getUint16(offset + 26, true);
	const extraLength = view.getUint16(offset + 28, true);
	const dataOffset = offset + 30 + fileNameLength + extraLength;
	if (dataOffset + entry.compressedSize > view.byteLength) {
		throw new Error("This DOCX file appears to be corrupt or incomplete.");
	}

	const compressedBytes = new Uint8Array(buffer, dataOffset, entry.compressedSize);

	if (entry.compressionMethod === 0) {
		return compressedBytes;
	}

	if (entry.compressionMethod === 8) {
		return inflateRawBytes(compressedBytes);
	}

	throw new Error("This DOCX file uses an unsupported compression method.");
}

async function inflateRawBytes(bytes) {
	if (typeof DecompressionStream === "undefined") {
		throw new Error("This browser cannot decompress DOCX files directly. Try a newer Chrome version or paste the text.");
	}

	try {
		const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
		return new Uint8Array(await new Response(stream).arrayBuffer());
	} catch (error) {
		throw new Error("This DOCX file could not be decompressed. It may be corrupt or password-protected.");
	}
}

function extractTextFromDocxXml(xml) {
	const normalizedXml = xml
		.replace(/<w:tab\/>/g, "\t")
		.replace(/<w:br\/>/g, "\n")
		.replace(/<\/w:p>/g, "\n");
	const textNodes = normalizedXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g) || [];
	return textNodes
		.map((node) => decodeXmlEntities(node.replace(/<[^>]+>/g, "")))
		.join(" ")
		.replace(/[ \t]+/g, " ")
		.replace(/\s+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function extractTextFromLegacyDoc(buffer) {
	if (!buffer || buffer.byteLength === 0) {
		throw new Error("The selected DOC file is empty.");
	}

	const bytes = new Uint8Array(buffer);
	const singleByteText = bytesToBinaryString(bytes)
		.replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, "\n")
		.split(/\n+/)
		.map((line) => line.trim())
		.filter((line) => line.length > 20)
		.join("\n");
	const utf16Text = extractUtf16LeText(bytes);
	const text = cleanPdfText(`${singleByteText}\n${utf16Text}`);

	if (countWords(text) < 20) {
		throw new Error("No readable legacy DOC text found. Save the file as DOCX or paste the text.");
	}

	return text;
}

function extractUtf16LeText(bytes) {
	let output = "";
	let current = "";
	for (let index = 0; index < bytes.length - 1; index += 2) {
		const code = bytes[index] + (bytes[index + 1] << 8);
		if (code === 9 || code === 10 || code === 13 || (code >= 32 && code <= 126)) {
			current += String.fromCharCode(code);
			continue;
		}

		if (current.length > 20) {
			output += `${current}\n`;
		}
		current = "";
	}

	if (current.length > 20) {
		output += current;
	}

	return output;
}
function decodeXmlEntities(value) {
	return value
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'");
}
function hasExtractedText(response) {
	const text = response && response.text;
	return Boolean(text && text.trim().length >= MIN_TEXT_LENGTH);
}

function loadHistory() {
	return new Promise((resolve) => {
		chrome.storage.local.get([HISTORY_STORAGE_KEY], (stored) => {
			state.history = Array.isArray(stored[HISTORY_STORAGE_KEY]) ? stored[HISTORY_STORAGE_KEY] : [];
			resolve();
		});
	});
}

function saveHistoryItem(item) {
	const historyItem = {
		id: `history-${Date.now()}`,
		mode: item.mode,
		output: item.output,
		sourceTitle: getHistorySourceTitle(item.source),
		providerName: item.providerName || "Provider",
		createdAt: Date.now(),
	};

	state.history = [historyItem, ...state.history].slice(0, MAX_HISTORY_ITEMS);
	renderHistory();
	return new Promise((resolve) => {
		chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: state.history }, resolve);
	});
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
			<span>${escapeHtml(getHistoryMeta(item))}</span>
		`;
		button.addEventListener("click", () => restoreHistoryItem(item));
		historyList.appendChild(button);
	}
}

function restoreHistoryItem(item) {
	state.lastOutput = item.output;
	result.textContent = item.output;
	copyButton.disabled = false;
	setStatus(`Restored ${item.mode === "links" ? "links" : "summary"} from recent history.`);
}

function clearHistory() {
	state.history = [];
	renderHistory();
	chrome.storage.local.remove(HISTORY_STORAGE_KEY);
	setStatus("Recent history cleared.");
}

function getHistorySourceTitle(source) {
	if (!source) {
		return "Previous output";
	}

	if (source.type === "page") {
		return source.domain || source.title || "Page summary";
	}

	return source.title || source.type || "Previous output";
}

function getHistoryMeta(item) {
	const date = new Date(item.createdAt).toLocaleString([], {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${item.mode === "links" ? "Links" : "Summary"} - ${item.providerName} - ${date}`;
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
