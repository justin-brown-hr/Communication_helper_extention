async function getSettings() {
  const { botToken, chatId, enabled } = await chrome.storage.sync.get([
    "botToken",
    "chatId",
    "enabled",
  ]);
  return { botToken, chatId, enabled: enabled !== false };
}

async function sendTelegramMessage(text) {
  const { botToken, chatId, enabled } = await getSettings();
  if (!enabled || !botToken || !chatId) return;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error("Telegram send failed:", res.status, errText);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "wa-notification") {
    const text = `WhatsApp: ${message.title}\n${message.body}`.trim();
    sendTelegramMessage(text);
  } else if (message.type === "test") {
    sendTelegramMessage("Test message from Communication Helper Extension ✅");
  }
});
