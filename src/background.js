// Each alert starts with a small coloured mark and the app name, then the
// sender and message. (Telegram bots can't put a small image inline in a text
// message — photos always display large — so the mark is an emoji.)
const APPS = {
  whatsapp: { label: "WhatsApp", mark: "🟢" },
  teams: { label: "Teams", mark: "🟣" },
  telegram: { label: "Telegram", mark: "🔵" },
};
// Cached per bot token: the bot's display name, used to ignore Telegram Web
// notifications for the bot's own chat.
let botNameCache = { token: null, name: null };

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
  const text = body || "";
  if (/^(🟢|🟣|🔵) (WhatsApp|Teams|Telegram)\b/u.test(text)) return true;
  if (/^(WhatsApp|Teams|Telegram): /.test(text)) return true; // older format
  if (text.startsWith("Test message from Communication Helper")) return true;
  const botName = await getBotName(botToken);
  return Boolean(botName && title === botName);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatAlert(app, title, body) {
  const { label, mark } = APPS[app];
  const lines = [`${mark} <b>${label}</b>`];
  if (title) lines.push(`<b>${escapeHtml(title)}</b>`);
  if (body) lines.push(escapeHtml(body));
  return lines.join("\n");
}

async function sendTelegramText(botToken, chatId, html) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: "HTML" }),
  });
  if (!res.ok) {
    console.error("Telegram sendMessage failed:", res.status, await res.text());
  }
}

// `app` is "whatsapp", "teams", "telegram", or undefined (test message).
async function sendTelegramAlert(app, title, body) {
  const settings = await getSettings();
  const { botToken, chatId, enabled } = settings;
  if (!enabled || !botToken || !chatId) return;
  if (app && !settings[`${app}Enabled`]) return;
  if (app === "telegram" && (await isOwnBotAlert(botToken, title, body))) return;

  const html = app
    ? formatAlert(app, title, body)
    : "Test message from Communication Helper Extension ✅";
  await sendTelegramText(botToken, chatId, html);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "wa-notification") {
    const app = APPS[message.app] ? message.app : "whatsapp";
    console.log("[wa-telegram-bridge] background received:", app, message.title);
    sendTelegramAlert(app, message.title || "", message.body || "");
  } else if (message.type === "test") {
    sendTelegramAlert();
  }
});
