const PROMPT_ID = "ai-summariser-page-prompt";
const PROMPT_STORAGE_KEY = "aiSummariserPromptTop";
const MIN_PROMPT_TEXT_LENGTH = 600;
const PROMPT_REAPPEAR_DELAY_MS = 12000;
const PROMPT_EDGE_OFFSET = 0;
const PROMPT_ICON_WIDTH = 38;
const PROMPT_ICON_HEIGHT = 40;

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
	const fallbackTop = Math.max(16, Math.round(window.innerHeight * 0.55));
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
	const maxTop = Math.max(16, window.innerHeight - PROMPT_ICON_HEIGHT - 16);
	return Math.min(Math.max(16, Math.round(top)), maxTop);
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
	prompt.id = PROMPT_ID;
	prompt.innerHTML = `
		<button class="ai-summariser-icon" type="button" aria-label="Open AI Summariser for this page">
			<span class="ai-summariser-tooltip">Open summariser</span>
			<span class="ai-summariser-icon-face" aria-hidden="true">
				<span></span>
				<span></span>
			</span>
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
			height: ${PROMPT_ICON_HEIGHT}px;
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
			width: ${PROMPT_ICON_WIDTH}px;
			height: ${PROMPT_ICON_HEIGHT}px;
			padding: 0;
			border: 1px solid rgba(255, 255, 255, 0.1);
			border-right: 0;
			border-radius: 10px 0 0 10px;
			background: rgba(17, 24, 39, 0.94);
			box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
			cursor: grab;
			font: inherit;
			opacity: 0.98;
			transition: opacity 140ms ease, transform 140ms ease, box-shadow 140ms ease;
		}
		#${PROMPT_ID} .ai-summariser-icon:hover {
			opacity: 0.08;
			transform: translateX(4px);
			box-shadow: 0 8px 18px rgba(0, 0, 0, 0.2);
		}
		#${PROMPT_ID} .ai-summariser-icon:active {
			cursor: grabbing;
			opacity: 0.7;
		}
		#${PROMPT_ID} .ai-summariser-tooltip {
			position: absolute;
			right: calc(100% + 10px);
			top: 50%;
			transform: translateY(-50%);
			width: max-content;
			max-width: 150px;
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
		#${PROMPT_ID} .ai-summariser-icon:hover .ai-summariser-tooltip {
			opacity: 1;
		}
		#${PROMPT_ID} .ai-summariser-icon-face {
			position: relative;
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 5px;
			width: 22px;
			height: 22px;
			padding: 7px 5px;
			border: 1px solid rgba(255, 255, 255, 0.38);
			border-radius: 7px;
			background: linear-gradient(135deg, #e7edf7 0%, #fff7fb 58%, #d8b6ff 100%);
			animation: aiSummariserNudge 2.2s ease-in-out infinite;
		}
		#${PROMPT_ID} .ai-summariser-icon-face span {
			display: block;
			width: 5px;
			height: 5px;
			border-radius: 999px;
			background: #111827;
		}
		@keyframes aiSummariserNudge {
			0%, 100% {
				transform: translateY(0);
			}
			50% {
				transform: translateY(-2px);
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

