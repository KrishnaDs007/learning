chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.set({ summariserEnabled: true });
	chrome.storage.local.get(["providerProfiles", "geminiApiKey"], ({ providerProfiles, geminiApiKey }) => {
		if (!geminiApiKey && (!Array.isArray(providerProfiles) || providerProfiles.length === 0)) {
			chrome.runtime.openOptionsPage();
		}
	});

	chrome.contextMenus.create({
		id: "summarise-selection",
		title: "Summarise selection",
		contexts: ["selection"],
	});
});

chrome.contextMenus.onClicked.addListener((info) => {
	if (info.menuItemId !== "summarise-selection" || !info.selectionText) {
		return;
	}

	chrome.storage.local.set({
		pendingSummaryText: info.selectionText,
		pendingSummarySource: {
			title: info.pageUrl || "Selected text",
			url: info.pageUrl || "",
			type: "selection",
		},
	});

	const popupRequest = chrome.action.openPopup();
	if (!popupRequest || typeof popupRequest.catch !== "function") {
		showSelectedTextBadge();
		return;
	}

	popupRequest.catch(() => {
		showSelectedTextBadge();
	});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type !== "OPEN_POPUP_WITH_TEXT" || !message.text) {
		return;
	}

	chrome.storage.local.set({
		pendingSummaryText: message.text,
		pendingSummarySource: message.source || {
			title: sender.tab?.title || "Current page",
			url: sender.tab?.url || "",
			type: "page",
		},
	}, () => {
		const popupRequest = chrome.action.openPopup();
		if (!popupRequest || typeof popupRequest.catch !== "function") {
			showSelectedTextBadge();
			sendResponse({ opened: false });
			return;
		}

		popupRequest
			.then(() => sendResponse({ opened: true }))
			.catch(() => {
				showSelectedTextBadge();
				sendResponse({ opened: false });
			});
	});

	return true;
});

function showSelectedTextBadge() {
	chrome.action.setBadgeText({ text: "TXT" });
	chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
}
