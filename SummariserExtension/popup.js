const GEMINI_MODEL = "gemini-3.1-flash-lite";
const MAX_INPUT_CHARS = 2000;
const EMPTY_STATE_TEXT = 'Select a type and click "Summarise"';

const summariseButton = document.getElementById("summarise");
const copyButton = document.getElementById("copy-btn");
const result = document.getElementById("result");
const summaryTypeSelect = document.getElementById("summary-type");

summariseButton.addEventListener("click", () => {
	const summaryType = summaryTypeSelect.value;
	showLoading();

	chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
		if (!geminiApiKey) {
			result.textContent =
				"No API key has been set. Please set it in the options page.";
			chrome.runtime.openOptionsPage();
			return;
		}

		chrome.storage.local.get(["pendingSummaryText"], ({ pendingSummaryText }) => {
			if (pendingSummaryText) {
				chrome.storage.local.remove("pendingSummaryText");
				summarizeText(pendingSummaryText, summaryType, geminiApiKey);
				return;
			}

			summarizeCurrentPage(summaryType, geminiApiKey);
		});
	});
});

copyButton.addEventListener("click", async () => {
	const text = result.textContent.trim();

	if (!text || text === EMPTY_STATE_TEXT) {
		return;
	}

	try {
		await navigator.clipboard.writeText(text);
		const originalText = copyButton.textContent;
		copyButton.textContent = "Copied";
		setTimeout(() => {
			copyButton.textContent = originalText;
		}, 1500);
	} catch (error) {
		result.textContent =
			"Could not copy the summary. Please select and copy it manually.";
	}
});

function showLoading() {
	result.innerHTML = '<div class="loading"><div class="loader"></div></div>';
}

function summarizeCurrentPage(summaryType, geminiApiKey) {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (!tabs || tabs.length === 0) {
			result.textContent = "No active tab found.";
			return;
		}

		requestArticleText(tabs[0].id, async (response) => {
			if (!hasExtractedText(response)) {
				return;
			}

			await summarizeText(response.text, summaryType, geminiApiKey);
		});
	});
}

function requestArticleText(tabId, onTextReceived) {
	chrome.tabs.sendMessage(tabId, { type: "GET_ARTICLE_TEXT" }, (response) => {
		if (!chrome.runtime.lastError) {
			onTextReceived(response);
			return;
		}

		result.textContent = "Content script not present. Attempting to inject...";

		chrome.scripting
			.executeScript({
				target: { tabId },
				files: ["content.js"],
			})
			.then(() => {
				chrome.tabs.sendMessage(
					tabId,
					{ type: "GET_ARTICLE_TEXT" },
					(retryResponse) => {
						if (chrome.runtime.lastError) {
							result.textContent =
								"Still no response: " + chrome.runtime.lastError.message;
							return;
						}

						onTextReceived(retryResponse);
					},
				);
			})
			.catch((error) => {
				result.textContent =
					"Injection failed: " +
					(error && error.message ? error.message : error);
			});
	});
}

function hasExtractedText(response) {
	const text = response && response.text;
	if (!text) {
		result.textContent = "Could not extract text from the current page.";
		return false;
	}

	return true;
}

async function summarizeText(text, summaryType, geminiApiKey) {
	try {
		const summary = await getGeminiSummary(text, summaryType, geminiApiKey);
		result.textContent = summary;
	} catch (error) {
		console.error("Error fetching summary:", error);
		result.textContent =
			"Gemini Error: " +
			(error.message || "An error occurred while fetching the summary.");
	}
}

async function getGeminiSummary(rawText, summaryType, geminiApiKey) {
	const text =
		rawText.length > MAX_INPUT_CHARS
			? rawText.slice(0, MAX_INPUT_CHARS) + "..."
			: rawText;

	const promptMap = {
		brief: `Summarise the following text in a concise manner: \n\n${text}`,
		detailed: `Provide a detailed summary of the following text: \n\n${text}`,
		bullets: `Summarise the following text into bullet points: \n\n${text}`,
	};

	const prompt = promptMap[summaryType] || promptMap.brief;

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
						parts: [
							{
								text: prompt,
							},
						],
					},
				],
				generationConfig: {
					temperature: 0.2,
				},
			}),
		},
	);

	if (!res.ok) {
		const { error } = await res.json();
		throw new Error(
			error?.message || "Failed to fetch summary from Gemini API.",
		);
	}

	const data = await res.json();
	return (
		data?.candidates?.[0]?.content?.parts?.[0]?.text || "No summary generated."
	);
}
