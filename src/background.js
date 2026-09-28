const WHATSAPP_ICON_PATH = "icons/whatsapp.png";
let iconBlobPromise = null;

function getIconBlob() {
  if (!iconBlobPromise) {
    iconBlobPromise = fetch(chrome.runtime.getURL(WHATSAPP_ICON_PATH)).then(
      (res) => res.blob()
    );
  }
  return iconBlobPromise;
}

async function getSettings() {
  const { botToken, chatId, enabled, whatsappEnabled, teamsEnabled } =
    await chrome.storage.sync.get([
      "botToken",
      "chatId",
      "enabled",
      "whatsappEnabled",
      "teamsEnabled",
    ]);
  return {
    botToken,
    chatId,
    enabled: enabled !== false,
    whatsappEnabled: whatsappEnabled !== false,
    teamsEnabled: teamsEnabled !== false,
  };
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

// `app` is "whatsapp", "teams", or undefined (test message).
async function sendTelegramAlert(text, app) {
  const { botToken, chatId, enabled, whatsappEnabled, teamsEnabled } =
    await getSettings();
  if (!enabled || !botToken || !chatId) return;
  if (app === "whatsapp" && !whatsappEnabled) return;
  if (app === "teams" && !teamsEnabled) return;

  // Only WhatsApp alerts carry the WhatsApp icon; everything else is text.
  if (app !== "whatsapp") {
    await sendTelegramText(botToken, chatId, text);
    return;
  }

  try {
    await sendTelegramPhoto(botToken, chatId, text);
  } catch (err) {
    console.error("Telegram photo alert failed, falling back to text:", err);
    await sendTelegramText(botToken, chatId, text);
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "wa-notification") {
    const app = message.app === "teams" ? "teams" : "whatsapp";
    const label = app === "teams" ? "Teams" : "WhatsApp";
    console.log("[wa-telegram-bridge] background received:", label, message.title);
    const text = `${label}: ${message.title}\n${message.body}`.trim();
    sendTelegramAlert(text, app);
  } else if (message.type === "test") {
    sendTelegramAlert("Test message from Communication Helper Extension ✅");
  }
});
