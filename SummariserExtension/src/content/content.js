const PROMPT_ID = "ai-summariser-page-prompt";
const MIN_PROMPT_TEXT_LENGTH = 600;

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

function getPageLinks() {
	const origin = location.origin;
	const seen = new Set();

	return Array.from(document.querySelectorAll("a[href]"))
		.map((anchor) => {
			const href = anchor.getAttribute("href");
			if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
				return null;
			}

			let url = "";
			try {
				url = new URL(href, origin).href;
			} catch (error) {
				return null;
			}

			return {
				text: cleanText(anchor.innerText || anchor.getAttribute("aria-label") || ""),
				url,
			};
		})
		.filter((link) => {
			if (!link || seen.has(link.url)) {
				return false;
			}
			seen.add(link.url);
			return true;
		});
}

function getPageMetadata(text, type = "page") {
	const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

	return {
		title: document.title || "Current page",
		url: location.href,
		domain: location.hostname,
		wordCount,
		type,
	};
}

function injectPagePrompt() {
	if (document.getElementById(PROMPT_ID) || window.top !== window) {
		return;
	}

	const text = getArticleText();
	if (text.length < MIN_PROMPT_TEXT_LENGTH) {
		return;
	}

	const prompt = document.createElement("aside");
	prompt.id = PROMPT_ID;
	prompt.innerHTML = `
		<div class="ai-summariser-card">
			<button class="ai-summariser-close" type="button" aria-label="Close summariser prompt">x</button>
			<strong>Summarise this page?</strong>
			<span>${getPageMetadata(text).wordCount} words detected</span>
			<button class="ai-summariser-action" type="button">Open summariser</button>
		</div>
	`;

	const style = document.createElement("style");
	style.textContent = `
		#${PROMPT_ID} {
			position: fixed;
			right: 18px;
			bottom: 18px;
			z-index: 2147483647;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
		}
		#${PROMPT_ID} .ai-summariser-card {
			position: relative;
			display: grid;
			gap: 6px;
			width: 230px;
			padding: 14px;
			border: 1px solid #b8e4df;
			border-radius: 8px;
			background: #ffffff;
			color: #14213d;
			box-shadow: 0 16px 38px rgba(20, 33, 61, 0.18);
		}
		#${PROMPT_ID} strong {
			font-size: 14px;
			line-height: 1.2;
		}
		#${PROMPT_ID} span {
			color: #5c667a;
			font-size: 12px;
		}
		#${PROMPT_ID} button {
			font: inherit;
		}
		#${PROMPT_ID} .ai-summariser-close {
			position: absolute;
			top: 6px;
			right: 6px;
			width: 24px;
			height: 24px;
			border: 0;
			border-radius: 999px;
			background: transparent;
			color: #5c667a;
			cursor: pointer;
		}
		#${PROMPT_ID} .ai-summariser-action {
			min-height: 34px;
			margin-top: 4px;
			border: 0;
			border-radius: 8px;
			background: #0f766e;
			color: #ffffff;
			font-weight: 800;
			cursor: pointer;
		}
	`;

	prompt.querySelector(".ai-summariser-close").addEventListener("click", () => {
		prompt.remove();
		style.remove();
	});

	prompt.querySelector(".ai-summariser-action").addEventListener("click", () => {
		chrome.runtime.sendMessage({
			type: "OPEN_POPUP_WITH_TEXT",
			text,
			source: getPageMetadata(text),
		});
	});

	document.documentElement.appendChild(style);
	document.documentElement.appendChild(prompt);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "GET_ARTICLE_TEXT") {
		const text = getArticleText();
		sendResponse({
			text,
			links: getPageLinks(),
			source: getPageMetadata(text, getSelectedText().length > 40 ? "selection" : "page"),
		});
	}

	if (request.type === "GET_PAGE_LINKS") {
		sendResponse({
			links: getPageLinks(),
			source: getPageMetadata("", "page"),
		});
	}
});

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", injectPagePrompt, { once: true });
} else {
	injectPagePrompt();
}

