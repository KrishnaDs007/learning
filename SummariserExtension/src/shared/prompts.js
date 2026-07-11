(function () {
	const MAX_INPUT_CHARS = 6000;

	function trimSourceText(rawText) {
		return rawText.length > MAX_INPUT_CHARS
			? rawText.slice(0, MAX_INPUT_CHARS) + "..."
			: rawText;
	}

	function buildSummaryPrompt(rawText, summaryType, summaryLength) {
		const text = trimSourceText(rawText);
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

	window.SummariserPrompts = {
		MAX_INPUT_CHARS,
		buildSummaryPrompt,
	};
})();

