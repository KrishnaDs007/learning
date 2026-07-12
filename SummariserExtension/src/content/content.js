const PROMPT_ID = "ai-summariser-page-prompt";
const PROMPT_STORAGE_KEY = "aiSummariserPromptTop";
const MIN_PROMPT_TEXT_LENGTH = 600;
const PROMPT_REAPPEAR_DELAY_MS = 12000;
const PROMPT_EDGE_OFFSET = 14;

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

function getPromptTop() {
	const fallbackTop = Math.max(PROMPT_EDGE_OFFSET, window.innerHeight - 72);
	const savedTop = Number(window.localStorage.getItem(PROMPT_STORAGE_KEY));
	return clampPromptTop(Number.isFinite(savedTop) ? savedTop : fallbackTop);
}

function setPromptTop(top) {
	const prompt = document.getElementById(PROMPT_ID);
	if (!prompt) {
		return;
	}

	const nextTop = clampPromptTop(top);
	prompt.style.top = `${nextTop}px`;
	prompt.style.right = `${PROMPT_EDGE_OFFSET}px`;
	window.localStorage.setItem(PROMPT_STORAGE_KEY, String(nextTop));
}

function clampPromptTop(top) {
	const maxTop = Math.max(PROMPT_EDGE_OFFSET, window.innerHeight - 46 - PROMPT_EDGE_OFFSET);
	return Math.min(Math.max(PROMPT_EDGE_OFFSET, Math.round(top)), maxTop);
}

function openSummariserPopup(prompt, text) {
	prompt.classList.add("ai-summariser-hidden");
	chrome.runtime.sendMessage({
		type: "OPEN_POPUP_WITH_TEXT",
		text,
		source: getPageMetadata(text),
	}, () => {
		window.setTimeout(() => {
			if (document.documentElement.contains(prompt)) {
				prompt.classList.remove("ai-summariser-hidden");
			}
		}, PROMPT_REAPPEAR_DELAY_MS);
	});
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
		<button class="ai-summariser-icon" type="button" aria-label="Open AI Summariser for this page" title="Summarise this page">
			<span class="ai-summariser-icon-mark">AI</span>
			<span class="ai-summariser-icon-pulse"></span>
		</button>
	`;

	const style = document.createElement("style");
	style.textContent = `
		#${PROMPT_ID} {
			position: fixed;
			right: ${PROMPT_EDGE_OFFSET}px;
			top: ${getPromptTop()}px;
			z-index: 2147483647;
			width: 46px;
			height: 46px;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			touch-action: none;
		}
		#${PROMPT_ID}.ai-summariser-hidden {
			display: none;
		}
		#${PROMPT_ID} .ai-summariser-icon {
			position: relative;
			display: grid;
			place-items: center;
			width: 46px;
			height: 46px;
			border: 1px solid #b8e4df;
			border-radius: 999px;
			background: #0f766e;
			color: #ffffff;
			box-shadow: 0 12px 30px rgba(20, 33, 61, 0.24);
			cursor: grab;
			font: inherit;
			font-size: 12px;
			font-weight: 900;
			letter-spacing: 0;
			opacity: 0.92;
			transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease;
		}
		#${PROMPT_ID} .ai-summariser-icon:hover {
			opacity: 0;
			transform: translateX(6px) scale(0.94);
			box-shadow: 0 8px 18px rgba(20, 33, 61, 0.18);
		}
		#${PROMPT_ID} .ai-summariser-icon:active {
			cursor: grabbing;
		}
		#${PROMPT_ID} .ai-summariser-icon-mark {
			position: relative;
			z-index: 2;
		}
		#${PROMPT_ID} .ai-summariser-icon-pulse {
			position: absolute;
			inset: -5px;
			border: 2px solid rgba(15, 118, 110, 0.32);
			border-radius: 999px;
			animation: aiSummariserPulse 1.8s ease-out infinite;
		}
		@keyframes aiSummariserPulse {
			0% {
				opacity: 0.75;
				transform: scale(0.86);
			}
			100% {
				opacity: 0;
				transform: scale(1.45);
			}
		}
	`;

	const iconButton = prompt.querySelector(".ai-summariser-icon");
	let dragState = null;

	iconButton.addEventListener("pointerdown", (event) => {
		dragState = {
			startY: event.clientY,
			startTop: prompt.offsetTop,
			moved: false,
		};
		iconButton.setPointerCapture(event.pointerId);
	});

	iconButton.addEventListener("pointermove", (event) => {
		if (!dragState) {
			return;
		}

		const deltaY = event.clientY - dragState.startY;
		if (Math.abs(deltaY) > 3) {
			dragState.moved = true;
		}

		setPromptTop(dragState.startTop + deltaY);
	});

	iconButton.addEventListener("pointerup", (event) => {
		if (!dragState) {
			return;
		}

		iconButton.releasePointerCapture(event.pointerId);
		const wasDragged = dragState.moved;
		dragState = null;

		if (!wasDragged) {
			openSummariserPopup(prompt, text);
		}
	});

	iconButton.addEventListener("pointercancel", () => {
		dragState = null;
	});

	window.addEventListener("resize", () => setPromptTop(prompt.offsetTop));

	document.documentElement.appendChild(style);
	document.documentElement.appendChild(prompt);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.type === "SUMMARISER_POPUP_CLOSED") {
		const prompt = document.getElementById(PROMPT_ID);
		if (prompt) {
			prompt.classList.remove("ai-summariser-hidden");
		}
		sendResponse({ shown: Boolean(prompt) });
		return;
	}

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

