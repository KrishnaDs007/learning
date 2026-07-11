chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.sync.set({ summariserEnabled: true });
	chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
		if (!geminiApiKey) {
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

function showSelectedTextBadge() {
		chrome.action.setBadgeText({ text: "TXT" });
		chrome.action.setBadgeBackgroundColor({ color: "#0f766e" });
}
