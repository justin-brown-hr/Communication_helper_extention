const botTokenEl = document.getElementById("botToken");
const chatIdEl = document.getElementById("chatId");
const enabledEl = document.getElementById("enabled");
const whatsappEnabledEl = document.getElementById("whatsappEnabled");
const teamsEnabledEl = document.getElementById("teamsEnabled");
const telegramEnabledEl = document.getElementById("telegramEnabled");
const statusEl = document.getElementById("status");

function showStatus(text) {
  statusEl.textContent = text;
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2500);
}

async function load() {
  const { botToken, chatId, enabled, whatsappEnabled, teamsEnabled, telegramEnabled } =
    await chrome.storage.sync.get([
      "botToken",
      "chatId",
      "enabled",
      "whatsappEnabled",
      "teamsEnabled",
      "telegramEnabled",
    ]);
  botTokenEl.value = botToken || "";
  chatIdEl.value = chatId || "";
  enabledEl.checked = enabled !== false;
  whatsappEnabledEl.checked = whatsappEnabled !== false;
  teamsEnabledEl.checked = teamsEnabled !== false;
  telegramEnabledEl.checked = telegramEnabled !== false;
}

function save() {
  return chrome.storage.sync.set({
    botToken: botTokenEl.value.trim(),
    chatId: chatIdEl.value.trim(),
    enabled: enabledEl.checked,
    whatsappEnabled: whatsappEnabledEl.checked,
    teamsEnabled: teamsEnabledEl.checked,
    telegramEnabled: telegramEnabledEl.checked,
  });
}

document.getElementById("save").addEventListener("click", async () => {
  await save();
  showStatus("Saved.");
});

document.getElementById("test").addEventListener("click", async () => {
  await save();
  chrome.runtime.sendMessage({ type: "test" });
  showStatus("Test message sent (check Telegram).");
});

load();
