# Communication_helper_extention

A Chrome/Edge browser extension that watches **WhatsApp Web** and forwards new
message alerts to **Telegram**, so you can keep WhatsApp open on your PC and
still get notified on your phone through Telegram.

## How it works

WhatsApp Web already triggers a native browser notification (via the
`Notification` API) whenever a new message arrives and the tab isn't
focused. This extension intercepts that call in the page context, relays the
title/body to the extension's background service worker, and forwards it to
a Telegram chat using a Telegram bot you control.

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

Keep `web.whatsapp.com` open and logged in on your PC. When a new WhatsApp
message arrives while the tab is unfocused, you'll get a Telegram alert with
the sender and message preview.

## Project structure

```
manifest.json       Extension manifest (MV3)
src/injected.js      Intercepts WhatsApp Web's Notification calls (page context)
src/content.js       Relays intercepted notifications to the background worker
src/background.js    Sends alerts to Telegram via the Bot API
src/options.html/js  Settings page (bot token, chat id, enable/disable)
src/popup.html/js    Toolbar popup showing current status
```
