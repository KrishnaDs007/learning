const GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_INPUT_CHARS = 6000;

const state = {
	lastSummary: "",
	source: null,
};

const summariseButton = document.getElementById("summarise");
const copyButton = document.getElementById("copy-btn");
const settingsButton = document.getElementById("settings-btn");
const result = document.getElementById("result");
const status = document.getElementById("status");
const sourceLabel = document.getElementById("source-label");
const summaryTypeSelect = document.getElementById("summary-type");
const summaryLengthSelect = document.getElementById("summary-length");

document.addEventListener("DOMContentLoaded", initialisePopup);
summariseButton.addEventListener("click", handleSummarise);
copyButton.addEventListener("click", copySummary);
settingsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

function initialisePopup() {
	copyButton.disabled = true;
	chrome.action.setBadgeText({ text: "" });

	chrome.storage.local.get(["pendingSummaryText", "pendingSummarySource"], ({ pendingSummaryText, pendingSummarySource }) => {
		if (pendingSummaryText) {
			state.source = pendingSummarySource || { type: "selection" };
			setSourceLabel(state.source);
			setStatus("Selected text is ready. Click Summarise to continue.");
			return;
		}

		setStatus("Choose a style, then summarise the current page or selected text.");
	});
}

function handleSummarise() {
	const summaryType = summaryTypeSelect.value;
	const summaryLength = summaryLengthSelect.value;

	setLoading();

	chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
		if (!geminiApiKey) {
			setError("No Gemini API key found. Opening settings so you can add one.");
			chrome.runtime.openOptionsPage();
			return;
		}

		chrome.storage.local.get(["pendingSummaryText", "pendingSummarySource"], ({ pendingSummaryText, pendingSummarySource }) => {
			if (pendingSummaryText) {
				chrome.storage.local.remove(["pendingSummaryText", "pendingSummarySource"]);
				state.source = pendingSummarySource || { type: "selection" };
				setSourceLabel(state.source);
				summarizeText(pendingSummaryText, summaryType, summaryLength, geminiApiKey);
				return;
			}

			summarizeCurrentPage(summaryType, summaryLength, geminiApiKey);
		});
	});
}

function summarizeCurrentPage(summaryType, summaryLength, geminiApiKey) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (!tabs || tabs.length === 0 || !tabs[0].id) {
			setError("No active tab found.");
			return;
		}

		requestArticleText(tabs[0].id, async (response) => {
			if (!hasExtractedText(response)) {
				return;
			}

			state.source = response.source;
			setSourceLabel(response.source);
			await summarizeText(response.text, summaryType, summaryLength, geminiApiKey);
		});
	});
}

function requestArticleText(tabId, onTextReceived) {
	chrome.tabs.sendMessage(tabId, { type: "GET_ARTICLE_TEXT" }, (response) => {
		if (!chrome.runtime.lastError) {
			onTextReceived(response);
			return;
		}

		setStatus("Preparing this page for summarisation...");

		chrome.scripting
			.executeScript({
				target: { tabId },
				files: ["src/content/content.js"],
			})
			.then(() => {
				chrome.tabs.sendMessage(tabId, { type: "GET_ARTICLE_TEXT" }, (retryResponse) => {
					if (chrome.runtime.lastError) {
						setError("This page cannot be summarised. Try a normal webpage or selected text.");
						return;
					}

					onTextReceived(retryResponse);
				});
			})
			.catch(() => {
				setError("Chrome blocked access to this page. Try selecting text manually on a normal webpage.");
			});
	});
}

function hasExtractedText(response) {
	const text = response && response.text;
	if (!text || text.trim().length < 40) {
		setError("I could not find enough readable text on this page.");
		return false;
	}

	return true;
}

async function summarizeText(text, summaryType, summaryLength, geminiApiKey) {
	try {
		const summary = await getGeminiSummary(text, summaryType, summaryLength, geminiApiKey);
		state.lastSummary = summary;
		result.textContent = summary;
		copyButton.disabled = false;
		setStatus(getSuccessMessage(text));
	} catch (error) {
		console.error("Error fetching summary:", error);
		setError(error.message || "Gemini could not generate a summary right now.");
	}
}

async function copySummary() {
	if (!state.lastSummary) {
		return;
	}

	try {
		await navigator.clipboard.writeText(state.lastSummary);
		const originalText = copyButton.textContent;
		copyButton.textContent = "Copied";
		setTimeout(() => {
			copyButton.textContent = originalText;
		}, 1400);
	} catch (error) {
		setError("Could not copy the summary. Select the text and copy it manually.");
	}
}

function setLoading() {
	summariseButton.disabled = true;
	copyButton.disabled = true;
	status.classList.remove("error");
	status.textContent = "Summarising with Gemini...";
	result.innerHTML = `
		<div class="loading">
			<div class="loader"></div>
			<span>Reading the page and preparing a clean summary</span>
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
	copyButton.disabled = !state.lastSummary;
	status.classList.add("error");
	status.textContent = message;
	result.innerHTML = `
		<div class="empty-state">
			<strong>Could not summarise</strong>
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

	const domain = source.domain || "current page";
	const words = source.wordCount ? ` · ${source.wordCount} words` : "";
	sourceLabel.textContent = `${domain}${words}`;
}

function getSuccessMessage(text) {
	const words = text.split(/\s+/).filter(Boolean).length;
	const sourceType = state.source && state.source.type === "selection" ? "selection" : "page";
	return `Summary ready from ${sourceType} content · ${words} words read`;
}

async function getGeminiSummary(rawText, summaryType, summaryLength, geminiApiKey) {
	const text =
		rawText.length > MAX_INPUT_CHARS
			? rawText.slice(0, MAX_INPUT_CHARS) + "..."
			: rawText;

	const prompt = buildPrompt(text, summaryType, summaryLength);
	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-goog-api-key": geminiApiKey,
			},
			body: JSON.stringify({
				contents: [
					{
						parts: [{ text: prompt }],
					},
				],
				generationConfig: {
					temperature: 0.2,
				},
			}),
		},
	);

	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error?.message || "Failed to fetch summary from Gemini API.");
	}

	const data = await res.json();
	return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated.";
}

function buildPrompt(text, summaryType, summaryLength) {
	const lengthInstructions = {
		short: "Keep it very concise in 3-4 sentences.",
		medium: "Keep it useful and compact in 2-4 short paragraphs.",
		long: "Provide a fuller summary with important context and nuance.",
	};

	const styleInstructions = {
		brief: "Write a clear plain-language summary.",
		detailed: "Write a detailed but readable summary.",
		bullets: "Write the summary as bullet points.",
		takeaways: "Extract the key takeaways and practical implications.",
	};

	return [
		styleInstructions[summaryType] || styleInstructions.brief,
		lengthInstructions[summaryLength] || lengthInstructions.medium,
		"Do not invent facts. Preserve important names, numbers, and dates.",
		"Text to summarise:",
		text,
	].join("\n\n");
}

function escapeHtml(value) {
	return value.replace(/[&<>"']/g, (character) => {
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

