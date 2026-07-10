function getArticleText() {
	const article = document.querySelector("article");
	if (article) {
		return article.innerText || article.textContent || "";
	}

	const paragraphs = Array.from(document.querySelectorAll("p"));
	return paragraphs.map((p) => p.innerText || p.textContent || "").join("\n");
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "GET_ARTICLE_TEXT") {
		const text = getArticleText();
		sendResponse({ text });
	}
});
