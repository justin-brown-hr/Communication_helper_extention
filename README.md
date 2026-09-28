# Communication_helper_extention

A Chrome/Edge browser extension that watches **WhatsApp Web**,
**Microsoft Teams (web)** and **Telegram Web** and forwards new message
alerts to **Telegram**, so you can keep them open on your PC and still get
notified on your phone through Telegram.

## How it works

WhatsApp Web, Teams and Telegram Web already trigger a native browser
notification whenever a new message arrives and the tab isn't focused —
either directly (`new Notification(...)` / `showNotification`) or by handing
it to their service worker (Telegram Web A). Teams additionally falls back
to watching the unread count in the tab title. This extension intercepts that
call in the page context, relays the title/body to the extension's
background service worker, and forwards it to a Telegram chat using a
Telegram bot you control. Each alert looks like this:

```
🟢 WhatsApp          🟣 Teams             🔵 Telegram
Alice                Bob                  Dave
See you at 6?        Meeting moved to 3   Sent the file
```

(Telegram bots can't put a small image inline in a text message, so each
app is marked with a coloured emoji and its name in bold.)

Supported Teams URLs: `teams.microsoft.com`, `teams.live.com`, and
`teams.cloud.microsoft`. In Teams, make sure desktop notifications are
turned on (Settings → Notifications) and the browser has granted
notification permission — otherwise Teams never fires a notification to
intercept. The Teams desktop app is not supported; use Teams in the browser.

Telegram Web (`web.telegram.org`) is useful when it's logged into a
*different* Telegram account from the one your bot messages — for example a
work account. If it's the same account, the extension ignores notifications
from your bot's own chat so alerts don't loop, but you'll get the most
value by muting the bot chat in Telegram Web or leaving Telegram alerts off
in Settings.

## Setup

### 1. Create a Telegram bot

1. Open Telegram and message **@BotFather**.
2. Send `/newbot` and follow the prompts. You'll get a **bot token** like
   `123456789:ABCdefGhIJKlmNoPQRstuVwxyZ`.
3. Send your new bot any message (e.g. "hi") so it can message you back.
4. Visit `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates` in a browser
   and find `"chat":{"id": ...}` in the response — that number is your
   **chat ID**.

### 2. Install the extension

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this project's folder.

### 3. Configure it

1. Click the extension icon → **Open Settings**.
2. Paste in your **Bot Token** and **Chat ID**.
3. Click **Save**, then **Send test message** to confirm it works.

### 4. Use it

Keep `web.whatsapp.com`, Teams and/or `web.telegram.org` open and logged in
on your PC. When a new message arrives while the tab is unfocused, you'll get
a Telegram alert with the sender and message preview. You can turn WhatsApp,
Teams or Telegram alerts off individually in Settings.

## Troubleshooting

- After updating the extension, click **Reload** on it in
  `chrome://extensions`, then reload each WhatsApp/Teams/Telegram tab.
- Alerts only fire while the tab is **not focused**; that's when the apps
  send notifications.
- Each site needs browser notification permission (padlock icon → Site
  settings → Notifications → Allow), and notifications must be on inside the
  app (Teams: Settings → Notifications; Telegram: Settings → Notifications →
  Web notifications).
- Open DevTools on the app's tab and look for `[wa-telegram-bridge]` lines in
  the console to see what the extension intercepted.
- If Teams only sends "New activity — N unread" alerts, Teams notified in a
  way the extension couldn't read, and the unread count in the tab title
  was used instead.

## Project structure

```
manifest.json       Extension manifest (MV3)
src/injected.js      Intercepts WhatsApp/Teams/Telegram notifications (page context)
src/content.js       Relays intercepted notifications to the background worker
src/background.js    Sends alerts to Telegram via the Bot API
src/options.html/js  Settings page (bot token, chat id, enable/disable)
src/popup.html/js    Toolbar popup showing current status
icons/               WhatsApp, Teams and Telegram icons
```
