(function () {
	const MAX_INPUT_CHARS = 12000;
	const CHUNK_SIZE = 3500;
	const MAX_CHUNKS = 4;

	function prepareSourceText(rawText) {
		const text = String(rawText || "").trim();
		if (text.length <= MAX_INPUT_CHARS) {
			return text;
		}

		return buildChunkedSourceText(text);
	}

	function buildChunkedSourceText(text) {
		const chunks = splitIntoChunks(text, CHUNK_SIZE);
		const selectedChunks = selectRepresentativeChunks(chunks, MAX_CHUNKS);
		return [
			`The source is long, so representative chunks are provided from across the document. Use them together and mention if details may be incomplete. Original length: ${text.length} characters.`,
			...selectedChunks.map((chunk, index) => `Chunk ${index + 1} of ${selectedChunks.length}:\n${chunk}`),
		].join("\n\n---\n\n");
	}

	function splitIntoChunks(text, chunkSize) {
		const paragraphs = text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
		const chunks = [];
		let current = "";

		for (const paragraph of paragraphs.length > 0 ? paragraphs : [text]) {
			if (current && current.length + paragraph.length + 2 > chunkSize) {
				chunks.push(current.trim());
				current = "";
			}

			if (paragraph.length > chunkSize) {
				chunks.push(...splitLongText(paragraph, chunkSize));
				continue;
			}

			current = current ? `${current}\n\n${paragraph}` : paragraph;
		}

		if (current.trim()) {
			chunks.push(current.trim());
		}

		return chunks;
	}

	function splitLongText(text, chunkSize) {
		const chunks = [];
		for (let index = 0; index < text.length; index += chunkSize) {
			chunks.push(text.slice(index, index + chunkSize));
		}
		return chunks;
	}

	function selectRepresentativeChunks(chunks, maxChunks) {
		if (chunks.length <= maxChunks) {
			return chunks;
		}

		const selected = [chunks[0]];
		const middleSlots = maxChunks - 2;
		for (let index = 1; index <= middleSlots; index += 1) {
			const chunkIndex = Math.round((chunks.length - 1) * (index / (middleSlots + 1)));
			selected.push(chunks[chunkIndex]);
		}
		selected.push(chunks[chunks.length - 1]);
		return selected;
	}

	function buildSummaryPrompt(rawText, summaryType, summaryLength, contentType = "auto", outputLanguage = "same", customInstruction = "") {
		const text = prepareSourceText(rawText);
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

		const contentInstructions = {
			auto: "Infer the content type and adapt the summary structure to what is most useful.",
			article: "Treat the source as an article. Emphasize the main argument, key facts, evidence, people, organizations, dates, and any conclusions.",
			documentation: "Treat the source as technical documentation. Emphasize purpose, prerequisites, setup steps, APIs/options, constraints, and common mistakes.",
			tutorial: "Treat the source as a tutorial. Emphasize the goal, step-by-step flow, required tools, important commands/settings, and expected outcome.",
			product: "Treat the source as a product page. Emphasize what the product does, target users, features, pricing or availability details, claims, limitations, and calls to action.",
			forum: "Treat the source as a forum or discussion thread. Emphasize the original question, consensus answer, competing viewpoints, useful fixes, warnings, and unresolved points.",
		};

		const languageInstructions = {
			same: "Write the summary in the same language as the source text.",
			english: "Write the summary in English.",
			hindi: "Write the summary in Hindi.",
			spanish: "Write the summary in Spanish.",
			french: "Write the summary in French.",
			german: "Write the summary in German.",
		};

		return [
			styleInstructions[summaryType] || styleInstructions.brief,
			lengthInstructions[summaryLength] || lengthInstructions.medium,
			contentInstructions[contentType] || contentInstructions.auto,
			languageInstructions[outputLanguage] || languageInstructions.same,
			formatCustomInstruction(customInstruction),
			"Do not invent facts. Preserve important names, numbers, and dates.",
			"Text to summarise:",
			text,
		].filter(Boolean).join("\n\n");
	}

	function buildFollowUpPrompt(rawText, previousSummary, question, outputLanguage = "same", customInstruction = "") {
		const text = prepareSourceText(rawText);
		const languageInstructions = {
			same: "Answer in the same language as the source text unless the user asks otherwise.",
			english: "Answer in English unless the user asks otherwise.",
			hindi: "Answer in Hindi unless the user asks otherwise.",
			spanish: "Answer in Spanish unless the user asks otherwise.",
			french: "Answer in French unless the user asks otherwise.",
			german: "Answer in German unless the user asks otherwise.",
		};

		return [
			"Answer the user's follow-up question using only the provided source text and previous summary.",
			languageInstructions[outputLanguage] || languageInstructions.same,
			formatCustomInstruction(customInstruction),
			"If the source does not contain the answer, say that clearly and briefly.",
			"Previous summary:",
			String(previousSummary || "").trim(),
			"Follow-up question:",
			String(question || "").trim(),
			"Source text:",
			text,
		].filter(Boolean).join("\n\n");
	}

	function formatCustomInstruction(customInstruction) {
		const instruction = String(customInstruction || "").trim();
		if (!instruction) {
			return "";
		}
		return `User instruction:\n${instruction}`;
	}

	window.SummariserPrompts = {
		MAX_INPUT_CHARS,
		CHUNK_SIZE,
		MAX_CHUNKS,
		buildFollowUpPrompt,
		buildSummaryPrompt,
		prepareSourceText,
	};
})();
