chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ summariserEnabled: true }, () => {
    console.log("Summariser extension installed and enabled.");
  });
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