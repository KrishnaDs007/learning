function cleanText(value) {
	return value.replace(/\s+/g, " ").trim();
}

function getSelectedText() {
	const selection = window.getSelection();
	return selection ? cleanText(selection.toString()) : "";
}

function getArticleText() {
	const selectedText = getSelectedText();
	if (selectedText.length > 40) {
		return selectedText;
	}

	const preferredContainer = document.querySelector(
		"article, main, [role='main'], .article, .post, .entry-content",
	);

	if (preferredContainer) {
		const text = cleanText(preferredContainer.innerText || preferredContainer.textContent || "");
		if (text.length > 200) {
			return text;
		}
	}

	const paragraphs = Array.from(document.querySelectorAll("p"))
		.map((paragraph) => cleanText(paragraph.innerText || paragraph.textContent || ""))
		.filter((text) => text.length > 40);

	return paragraphs.join("\n\n");
}

function getPageMetadata(text) {
	const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

	return {
		title: document.title || "Current page",
		url: location.href,
		domain: location.hostname,
		wordCount,
		type: getSelectedText().length > 40 ? "selection" : "page",
	};
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "GET_ARTICLE_TEXT") {
		const text = getArticleText();
		sendResponse({
			text,
			source: getPageMetadata(text),
		});
	}
});

