(function () {
	const HISTORY_STORAGE_KEY = "summaryHistory";
	const MAX_HISTORY_ITEMS = 5;

	function load() {
		return new Promise((resolve) => {
			chrome.storage.local.get([HISTORY_STORAGE_KEY], (stored) => {
				const history = Array.isArray(stored[HISTORY_STORAGE_KEY]) ? stored[HISTORY_STORAGE_KEY] : [];
				resolve(history);
			});
		});
	}

	function save(history) {
		return new Promise((resolve) => {
			chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: history }, resolve);
		});
	}

	function clear() {
		return new Promise((resolve) => {
			chrome.storage.local.remove(HISTORY_STORAGE_KEY, resolve);
		});
	}

	function prepend(history, item) {
		const historyItem = {
			id: `history-${Date.now()}`,
			mode: item.mode,
			output: item.output,
			sourceTitle: getSourceTitle(item.source),
			providerName: item.providerName || "Provider",
			createdAt: Date.now(),
		};

		return [historyItem, ...history].slice(0, MAX_HISTORY_ITEMS);
	}

	function getSourceTitle(source) {
		if (!source) {
			return "Previous output";
		}

		if (source.type === "page") {
			return source.domain || source.title || "Page summary";
		}

		return source.title || source.type || "Previous output";
	}

	function getMeta(item) {
		const date = new Date(item.createdAt).toLocaleString([], {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
		return `${getModeLabel(item.mode)} - ${item.providerName} - ${date}`;
	}

	function getModeLabel(mode) {
		if (mode === "links") {
			return "Links";
		}
		if (mode === "follow-up") {
			return "Follow-up";
		}
		return "Summary";
	}

	window.PopupHistoryStore = {
		load,
		save,
		clear,
		prepend,
		getMeta,
	};
})();
