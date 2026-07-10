document.getElementById("summarise").addEventListener("click", () => {
	const result = document.getElementById("result");
	const summaryType = document.getElementById("summary-type").value;

	result.innerHTML = '<div class="loading"><div class="loader"></div></div>';

	chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
		if (!geminiApiKey) {
			result.textContent =
				"No API key has been set. Please set it in the options page.";
			return;
		}

		chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs || tabs.length === 0) {
				result.textContent = "No active tab found.";
				return;
			}
			const tab = tabs[0];

			function processResponse(response) {
				const text = response && response.text;
				if (!text) {
					result.textContent = "Could not Extract from the current page.";
					return false;
				}
				return true;
			}

			function requestAndSummarize() {
				chrome.tabs.sendMessage(
					tab.id,
					{ type: "GET_ARTICLE_TEXT" },
					async (response) => {
						if (chrome.runtime.lastError) {
							// No receiver on the page
							result.textContent =
								"Content script not present. Attempting to inject...";
							chrome.scripting
								.executeScript({
									target: { tabId: tab.id },
									files: ["content.js"],
								})
								.then(() => {
									// try again after injection
									chrome.tabs.sendMessage(
										tab.id,
										{ type: "GET_ARTICLE_TEXT" },
										async (resp2) => {
											if (chrome.runtime.lastError) {
												result.textContent =
													"Still no response: " +
													chrome.runtime.lastError.message;
												return;
											}
											if (!processResponse(resp2)) return;
											try {
												const summary = await getGeminiSummary(
													resp2.text,
													summaryType,
													geminiApiKey,
												);
												result.textContent = summary;
											} catch (error) {
												console.error("Error fetching summary:", error);
												result.textContent =
													"Gemini Error: " +
													(error.message ||
														"An error occurred while fetching the summary.");
											}
										},
									);
								})
								.catch((err) => {
									result.textContent =
										"Injection failed: " +
										(err && err.message ? err.message : err);
								});
							return;
						}

						if (!processResponse(response)) return;

						try {
							const summary = await getGeminiSummary(
								response.text,
								summaryType,
								geminiApiKey,
							);
							result.textContent = summary;
						} catch (error) {
							console.error("Error fetching summary:", error);
							result.textContent =
								"Gemini Error: " +
								(error.message ||
									"An error occurred while fetching the summary.");
						}
					},
				);
			}

			requestAndSummarize();
		});
	});
});

async function getGeminiSummary(rawText, summaryType, geminiApiKey) {
	const max = 2000;
	const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

	const promptMap = {
		brief: `Summarise the following text in a concise manner: \n\n${text}`,
		detailed: `Provide a detailed summary of the following text: \n\n${text}`,
		bullets: `Summarise the following text into bullet points: \n\n${text}`,
	};

	const prompt = promptMap[summaryType] || promptMap.brief;

	console.log("Using prompt:", prompt, geminiApiKey, rawText); // Log the prompt for debugging

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`,
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
