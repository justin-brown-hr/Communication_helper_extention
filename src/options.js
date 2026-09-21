const botTokenEl = document.getElementById("botToken");
const chatIdEl = document.getElementById("chatId");
const enabledEl = document.getElementById("enabled");
const statusEl = document.getElementById("status");

function showStatus(text) {
  statusEl.textContent = text;
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2500);
}

async function load() {
  const { botToken, chatId, enabled } = await chrome.storage.sync.get([
    "botToken",
    "chatId",
    "enabled",
  ]);
  botTokenEl.value = botToken || "";
  chatIdEl.value = chatId || "";
  enabledEl.checked = enabled !== false;
}

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    botToken: botTokenEl.value.trim(),
    chatId: chatIdEl.value.trim(),
    enabled: enabledEl.checked,
  });
  showStatus("Saved.");
});

document.getElementById("test").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    botToken: botTokenEl.value.trim(),
    chatId: chatIdEl.value.trim(),
    enabled: enabledEl.checked,
  });
  chrome.runtime.sendMessage({ type: "test" });
  showStatus("Test message sent (check Telegram).");
});

load();
