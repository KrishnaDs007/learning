document.addEventListener("DOMContentLoaded", () => {
	chrome.storage.sync.get(["geminiApiKey"], ({ geminiApiKey }) => {
		if (geminiApiKey) {
			document.getElementById("api-key").value = geminiApiKey;
		}
		// const apiKeyInput = document.getElementById("api-key");
		// apiKeyInput.value = geminiApiKey || "";
	});

	document.getElementById("save-btn").addEventListener("click", () => {
		const apiKey = document.getElementById("api-key").value.trim();

		if (!apiKey) {
			// alert("Please enter a valid API key.");
			return;
		}

		chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
			const successMessage = document.getElementById("success-message");
			successMessage.style.display = "block";

			setTimeout(() => {
				window.close();
			}, 3000);
		});
	});
});
