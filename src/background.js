const WHATSAPP_ICON_PATH = "icons/whatsapp.png";
const APP_LABELS = { whatsapp: "WhatsApp", teams: "Teams", telegram: "Telegram" };
let iconBlobPromise = null;
// Cached per bot token: the bot's display name, used to ignore Telegram Web
// notifications for the bot's own chat.
let botNameCache = { token: null, name: null };

function getIconBlob() {
  if (!iconBlobPromise) {
    iconBlobPromise = fetch(chrome.runtime.getURL(WHATSAPP_ICON_PATH)).then(
      (res) => res.blob()
    );
  }
  return iconBlobPromise;
}

async function getSettings() {
  const { botToken, chatId, enabled, whatsappEnabled, teamsEnabled, telegramEnabled } =
    await chrome.storage.sync.get([
      "botToken",
      "chatId",
      "enabled",
      "whatsappEnabled",
      "teamsEnabled",
      "telegramEnabled",
    ]);
  return {
    botToken,
    chatId,
    enabled: enabled !== false,
    whatsappEnabled: whatsappEnabled !== false,
    teamsEnabled: teamsEnabled !== false,
    telegramEnabled: telegramEnabled !== false,
  };
}

async function getBotName(botToken) {
  if (botNameCache.token === botToken) return botNameCache.name;
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json();
    const name = (data.ok && data.result && data.result.first_name) || null;
    botNameCache = { token: botToken, name };
    return name;
  } catch (err) {
    console.error("Telegram getMe failed:", err);
    return null;
  }
}

// Telegram Web shows a notification when our bot sends you an alert.
// Forwarding that would send another alert, and so on forever — skip it.
async function isOwnBotAlert(botToken, title, body) {
  if (/^(WhatsApp|Teams|Telegram): /.test(body || "")) return true;
  if (body && body.startsWith("Test message from Communication Helper")) return true;
  const botName = await getBotName(botToken);
  return Boolean(botName && title === botName);
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

// `app` is "whatsapp", "teams", "telegram", or undefined (test message).
async function sendTelegramAlert(app, title, body) {
  const settings = await getSettings();
  const { botToken, chatId, enabled } = settings;
  if (!enabled || !botToken || !chatId) return;
  if (app && !settings[`${app}Enabled`]) return;
  if (app === "telegram" && (await isOwnBotAlert(botToken, title, body))) return;

  const text = app
    ? `${APP_LABELS[app]}: ${title}\n${body}`.trim()
    : "Test message from Communication Helper Extension ✅";

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
    const app = APP_LABELS[message.app] ? message.app : "whatsapp";
    console.log("[wa-telegram-bridge] background received:", app, message.title);
    sendTelegramAlert(app, message.title || "", message.body || "");
  } else if (message.type === "test") {
    sendTelegramAlert();
  }
});
