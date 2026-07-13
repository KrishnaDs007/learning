const PROMPT_ID = "ai-summariser-page-prompt";
const PROMPT_STORAGE_KEY = "aiSummariserPromptTop";
const MIN_PROMPT_TEXT_LENGTH = 600;
const PROMPT_REAPPEAR_DELAY_MS = 12000;
const PROMPT_EDGE_OFFSET = 0;
const PROMPT_ICON_WIDTH = 34;
const PROMPT_ICON_HEIGHT = 36;
const PROMPT_HOVER_TOP_SPACE = 44;
const PROMPT_TOTAL_HEIGHT = PROMPT_ICON_HEIGHT + PROMPT_HOVER_TOP_SPACE;

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

	const preferredContainer = findReadableContainer();
	const paragraphs = getReadableParagraphs(preferredContainer || document.body);
	if (paragraphs.length > 0) {
		return dedupeTextBlocks(paragraphs).join("\n\n");
	}

	if (preferredContainer) {
		return cleanExtractedText(preferredContainer.innerText || preferredContainer.textContent || "");
	}

	return cleanExtractedText(document.body?.innerText || document.body?.textContent || "");
}

function findReadableContainer() {
	const selectors = [
		"article",
		"main",
		"[role='main']",
		".article",
		".post",
		".entry-content",
		".content",
	];
	const candidates = selectors
		.flatMap((selector) => Array.from(document.querySelectorAll(selector)))
		.filter((element) => !isIgnoredElement(element));

	return candidates
		.map((element) => ({
			element,
			score: getTextDensityScore(element),
		}))
		.filter((candidate) => candidate.score > 200)
		.sort((a, b) => b.score - a.score)[0]?.element || null;
}

function getReadableParagraphs(root) {
	return Array.from(root.querySelectorAll("p, li, blockquote, h1, h2, h3"))
		.filter((element) => !isIgnoredElement(element))
		.map((element) => cleanText(element.innerText || element.textContent || ""))
		.filter(isUsefulTextBlock);
}

function cleanExtractedText(text) {
	return dedupeTextBlocks(
		text
			.split(/\n+/)
			.map(cleanText)
			.filter(isUsefulTextBlock),
	).join("\n\n");
}

function isIgnoredElement(element) {
	return Boolean(element.closest([
		"nav",
		"header",
		"footer",
		"aside",
		"script",
		"style",
		"noscript",
		"form",
		"button",
		"[role='navigation']",
		"[role='banner']",
		"[role='contentinfo']",
		"[aria-hidden='true']",
		".nav",
		".navbar",
		".menu",
		".sidebar",
		".footer",
		".header",
		".advertisement",
		".ads",
		".cookie",
	].join(",")));
}

function isUsefulTextBlock(text) {
	if (!text || text.length < 45) {
		return false;
	}

	const words = text.split(/\s+/).filter(Boolean);
	const linkLikeText = /^(home|menu|share|subscribe|sign in|log in|privacy|terms|advertisement)$/i;
	return words.length >= 8 && !linkLikeText.test(text);
}

function dedupeTextBlocks(blocks) {
	const seen = new Set();
	return blocks.filter((block) => {
		const key = block.toLowerCase().replace(/\W+/g, " ").trim().slice(0, 180);
		if (!key || seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

function getTextDensityScore(element) {
	const text = cleanText(element.innerText || element.textContent || "");
	const links = Array.from(element.querySelectorAll("a"))
		.map((link) => cleanText(link.innerText || link.textContent || ""))
		.join(" ");
	const linkPenalty = links.length * 0.75;
	const paragraphBonus = element.querySelectorAll("p").length * 80;
	return text.length + paragraphBonus - linkPenalty;
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
	const fallbackTop = Math.max(PROMPT_HOVER_TOP_SPACE, Math.round(window.innerHeight * 0.55));
	let savedTop = Number.NaN;

	try {
		savedTop = Number(window.localStorage.getItem(PROMPT_STORAGE_KEY));
	} catch (error) {
		savedTop = Number.NaN;
	}

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

	try {
		window.localStorage.setItem(PROMPT_STORAGE_KEY, String(nextTop));
	} catch (error) {
		// Some privacy-restricted pages block localStorage; dragging should still work for the current page.
	}
}

function clampPromptTop(top) {
	const maxTop = Math.max(PROMPT_HOVER_TOP_SPACE, window.innerHeight - PROMPT_TOTAL_HEIGHT - 16);
	return Math.min(Math.max(PROMPT_HOVER_TOP_SPACE, Math.round(top)), maxTop);
}

function openSummariserPopup(prompt, text) {
	prompt.classList.add("ai-summariser-hidden");
	chrome.runtime.sendMessage({
		type: "OPEN_POPUP_WITH_TEXT",
		text,
		source: getPageMetadata(text),
	}, () => {
		void chrome.runtime.lastError;
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
	const iconUrl = chrome.runtime.getURL("assets/icons/icon-32.png");
	prompt.id = PROMPT_ID;
	prompt.innerHTML = `
		<span class="ai-summariser-tooltip">Open summariser</span>
		<button class="ai-summariser-close" type="button" aria-label="Hide AI Summariser">x</button>
		<button class="ai-summariser-icon" type="button" aria-label="Open AI Summariser for this page">
			<img class="ai-summariser-icon-image" src="${iconUrl}" alt="" aria-hidden="true">
		</button>
	`;

	const style = document.createElement("style");
	style.textContent = `
		#${PROMPT_ID} {
			position: fixed;
			right: ${PROMPT_EDGE_OFFSET}px;
			top: ${getPromptTop()}px;
			z-index: 2147483647;
			width: ${PROMPT_ICON_WIDTH}px;
			height: ${PROMPT_TOTAL_HEIGHT}px;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			opacity: 0.5;
			touch-action: none;
			transition: opacity 140ms ease;
		}
		#${PROMPT_ID}:hover,
		#${PROMPT_ID}:focus-within {
			opacity: 1;
		}
		#${PROMPT_ID}.ai-summariser-hidden {
			display: none;
		}
		#${PROMPT_ID} .ai-summariser-icon {
			position: absolute;
			right: 0;
			bottom: 0;
			display: grid;
			place-items: center;
			width: ${PROMPT_ICON_WIDTH}px;
			height: ${PROMPT_ICON_HEIGHT}px;
			padding: 0;
			border: 1px solid rgba(255, 255, 255, 0.32);
			border-right: 0;
			border-radius: 10px 0 0 10px;
			background: linear-gradient(180deg, rgba(25, 32, 48, 0.98), rgba(12, 18, 31, 0.98));
			box-shadow: 0 10px 24px rgba(0, 0, 0, 0.32), inset 3px 0 0 #a78bfa;
			cursor: grab;
			font: inherit;
			animation: aiSummariserAttention 30s ease-in-out infinite;
			transition: transform 140ms ease, box-shadow 140ms ease;
		}
		#${PROMPT_ID} .ai-summariser-icon:hover {
			transform: translateX(0);
			box-shadow: 0 12px 28px rgba(0, 0, 0, 0.36), inset 3px 0 0 #c4b5fd;
		}
		#${PROMPT_ID} .ai-summariser-icon:active {
			cursor: grabbing;
			opacity: 0.7;
		}
		#${PROMPT_ID} .ai-summariser-tooltip {
			position: absolute;
			right: 0;
			top: 6px;
			width: max-content;
			max-width: 140px;
			padding: 6px 9px;
			border-radius: 7px;
			background: #ffffff;
			color: #14213d;
			box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
			font-size: 12px;
			font-weight: 700;
			letter-spacing: 0;
			line-height: 1.2;
			opacity: 0;
			pointer-events: none;
			transition: opacity 140ms ease;
		}
		#${PROMPT_ID}:hover .ai-summariser-tooltip,
		#${PROMPT_ID}:focus-within .ai-summariser-tooltip {
			opacity: 1;
		}
		#${PROMPT_ID} .ai-summariser-close {
			position: absolute;
			right: ${PROMPT_ICON_WIDTH + 6}px;
			bottom: 8px;
			display: grid;
			place-items: center;
			width: 18px;
			height: 18px;
			padding: 0;
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 999px;
			background: linear-gradient(180deg, rgba(25, 32, 48, 0.98), rgba(12, 18, 31, 0.98));
			color: #ffffff;
			box-shadow: 0 8px 18px rgba(0, 0, 0, 0.24);
			cursor: pointer;
			font: inherit;
			font-size: 13px;
			line-height: 1;
			opacity: 0;
			pointer-events: none;
			transition: opacity 140ms ease, transform 140ms ease;
		}
		#${PROMPT_ID}:hover .ai-summariser-close,
		#${PROMPT_ID}:focus-within .ai-summariser-close {
			opacity: 1;
			pointer-events: auto;
		}
		#${PROMPT_ID} .ai-summariser-close:hover {
			transform: scale(1.05);
		}
		#${PROMPT_ID} .ai-summariser-icon-image {
			width: 24px;
			height: 24px;
			border-radius: 7px;
			filter: drop-shadow(0 0 9px rgba(192, 132, 252, 0.56));
			pointer-events: none;
		}
		@keyframes aiSummariserAttention {
			0%, 8%, 100% {
				transform: translateY(0);
			}
			2% {
				transform: translateY(-3px);
			}
			4% {
				transform: translateY(2px);
			}
			6% {
				transform: translateY(-1px);
			}
		}
	`;

	const closeButton = prompt.querySelector(".ai-summariser-close");
	const iconButton = prompt.querySelector(".ai-summariser-icon");
	let dragState = null;

	closeButton.addEventListener("click", (event) => {
		event.stopPropagation();
		prompt.remove();
		style.remove();
	});

	iconButton.addEventListener("pointerdown", (event) => {
		dragState = {
			startY: event.clientY,
			startTop: prompt.offsetTop,
			moved: false,
		};
		event.preventDefault();
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

		event.preventDefault();
		setPromptTop(dragState.startTop + deltaY);
	});

	iconButton.addEventListener("pointerup", (event) => {
		if (!dragState) {
			return;
		}

		if (iconButton.hasPointerCapture(event.pointerId)) {
			iconButton.releasePointerCapture(event.pointerId);
		}
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
