const ICON_PATH = "icons/whatsapp.png";
let iconBlobPromise = null;

function getIconBlob() {
  if (!iconBlobPromise) {
    iconBlobPromise = fetch(chrome.runtime.getURL(ICON_PATH)).then((res) =>
      res.blob()
    );
  }
  return iconBlobPromise;
}

async function getSettings() {
  const { botToken, chatId, enabled } = await chrome.storage.sync.get([
    "botToken",
    "chatId",
    "enabled",
  ]);
  return { botToken, chatId, enabled: enabled !== false };
}

async function sendTelegramText(botToken, chatId, text) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    console.error("Telegram sendMessage failed:", res.status, await res.text());
  }
}

async function sendTelegramPhoto(botToken, chatId, caption) {
  const blob = await getIconBlob();
  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("photo", blob, "whatsapp.png");

  const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
  const res = await fetch(url, { method: "POST", body: form });
  if (!res.ok) {
    console.error("Telegram sendPhoto failed:", res.status, await res.text());
    // Fall back to a plain text alert so the message still gets through.
    await sendTelegramText(botToken, chatId, caption);
  }
}

async function sendTelegramAlert(text) {
  const { botToken, chatId, enabled } = await getSettings();
  if (!enabled || !botToken || !chatId) return;

  try {
    await sendTelegramPhoto(botToken, chatId, text);
  } catch (err) {
    console.error("Telegram photo alert failed, falling back to text:", err);
    await sendTelegramText(botToken, chatId, text);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "wa-notification") {
    const text = `WhatsApp: ${message.title}\n${message.body}`.trim();
    sendTelegramAlert(text);
  } else if (message.type === "test") {
    sendTelegramAlert("Test message from Communication Helper Extension ✅");
  }
});
