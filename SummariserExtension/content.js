function getArticleText() {
	const article = document.querySelector("article");
	if (article) {
		return article.innerText || article.textContent || "";
	}

	const paragraphs = Array.from(document.querySelectorAll("p"));
	return paragraphs.map((p) => p.innerText || p.textContent || "").join("\n");
}

// Debug: confirm the content script is loaded in the page
try {
	console.log("Summariser content script loaded on", location.href);
} catch (e) {
	// ignore if page blocks console access
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "GET_ARTICLE_TEXT") {
		const text = getArticleText();
		sendResponse({ text });
	}
});
