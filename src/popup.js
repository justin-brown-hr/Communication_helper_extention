const statusEl = document.getElementById("status");

chrome.storage.sync.get(["botToken", "chatId", "enabled"]).then(
  ({ botToken, chatId, enabled }) => {
    if (!botToken || !chatId) {
      statusEl.textContent = "Not configured yet. Open settings to add your Telegram bot.";
      statusEl.className = "warn";
    } else if (enabled === false) {
      statusEl.textContent = "Configured, but alerts are turned off.";
      statusEl.className = "warn";
    } else {
      statusEl.textContent = "Active — alerts will be sent to Telegram.";
      statusEl.className = "ok";
    }
  }
);

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});
