chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ summariserEnabled: true });
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (!result.geminiApiKey) {
      chrome.tabs.create({ url: "option.html" });
    }
  });
  chrome.contextMenus.create({
    id: "summarise",
    title: "Summarise Selection",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "summarise" || !info.selectionText) {
    return;
  }

  chrome.storage.local.set({ pendingSummaryText: info.selectionText }, () => {
    chrome.action.openPopup();
  });
});
