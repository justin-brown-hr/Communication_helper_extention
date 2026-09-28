// Runs in the page's own JS context (world: "MAIN") on WhatsApp Web,
// Microsoft Teams (web) and Telegram Web. When a new message arrives in a
// backgrounded tab, these apps show a notification in one of three ways:
//   1. `new Notification(...)` in the page (WhatsApp, Telegram Web K),
//   2. `registration.showNotification(...)` from the page, or
//   3. posting the notification to their own service worker, which then shows
//      it (Telegram Web A, and likely Teams). Content scripts can't run inside
//      a service worker, so we catch the message on its way there instead.
// We intercept all three and forward the alert to our content script without
// touching the app's DOM. Teams additionally gets a fallback that watches the
// unread count in the tab title, in case it notifies in a way we can't see.
(function () {
  const host = location.hostname;
  const app = host.includes("whatsapp")
    ? "whatsapp"
    : host.includes("telegram")
      ? "telegram"
      : "teams";
  let lastRelayAt = 0;

  function relay(title, body, via) {
    try {
      lastRelayAt = Date.now();
      console.log("[wa-telegram-bridge] intercepted notification:", app, via, title);
      window.postMessage(
        {
          source: "wa-telegram-bridge",
          app,
          title: title || "",
          body: body || "",
        },
        "*"
      );
    } catch (err) {
      // Never let bridging break the app's own notification.
    }
  }

  // 1. new Notification(...)
  const OriginalNotification = window.Notification;
  if (OriginalNotification && !OriginalNotification.__waTelegramBridged) {
    function PatchedNotification(title, options) {
      relay(title, options && options.body, "Notification");
      return new OriginalNotification(title, options);
    }

    PatchedNotification.prototype = OriginalNotification.prototype;
    // A live getter, not a copied string: the app checks Notification.permission
    // before deciding whether to fire a notification, and that check needs to
    // reflect the browser's current permission state, not whatever it was when
    // this script ran (document_start, likely before permission was granted).
    Object.defineProperty(PatchedNotification, "permission", {
      get() {
        return OriginalNotification.permission;
      },
      configurable: true,
    });
    PatchedNotification.requestPermission =
      OriginalNotification.requestPermission.bind(OriginalNotification);
    PatchedNotification.__waTelegramBridged = true;

    window.Notification = PatchedNotification;
  }

  // 2. registration.showNotification(...) called from the page.
  const SWR = window.ServiceWorkerRegistration;
  if (SWR && SWR.prototype.showNotification && !SWR.prototype.__waTelegramBridged) {
    const originalShow = SWR.prototype.showNotification;
    SWR.prototype.showNotification = function (title, options) {
      relay(title, options && options.body, "showNotification");
      return originalShow.call(this, title, options);
    };
    SWR.prototype.__waTelegramBridged = true;
  }

  // 3. Notifications handed to the app's service worker via postMessage, e.g.
  // Telegram Web A: {type: "showMessageNotification", payload: {title, body}}.
  function extractNotification(message) {
    if (!message || typeof message !== "object") return null;
    const type = String(message.type || message.action || message.name || "");
    if (!/notif/i.test(type)) return null;
    if (/close|clear|dismiss|hide|remove|cancel|ready|subscri/i.test(type)) return null;
    const candidates = [message.payload, message.data, message.notification, message];
    for (const c of candidates) {
      if (c && typeof c === "object" && typeof c.title === "string" && c.title) {
        const body =
          typeof c.body === "string" ? c.body : typeof c.message === "string" ? c.message : "";
        return { title: c.title, body };
      }
    }
    console.debug("[wa-telegram-bridge] unrecognised notification message:", message);
    return null;
  }

  const SW = window.ServiceWorker;
  if (SW && SW.prototype.postMessage && !SW.prototype.__waTelegramBridged) {
    const originalPost = SW.prototype.postMessage;
    SW.prototype.postMessage = function (message, ...rest) {
      try {
        const n = extractNotification(message);
        if (n) relay(n.title, n.body, "serviceWorker.postMessage");
      } catch (err) {
        // Ignore — never break the app's own messaging.
      }
      return originalPost.call(this, message, ...rest);
    };
    SW.prototype.__waTelegramBridged = true;
  }

  // Teams fallback: alert when the "(N)" unread count in the tab title goes up
  // while the tab isn't focused, unless a real notification was just relayed.
  // (Not used for Telegram: the bot's own alerts raise Telegram's unread count
  // too, which would loop.)
  if (app === "teams" && window.top === window) {
    const unreadCount = (title) => {
      const m = /\((\d+)\+?\)/.exec(title || "");
      return m ? Number(m[1]) : null;
    };
    const startedAt = Date.now();
    let lastCount = 0;
    let noCountSince = null;

    setInterval(() => {
      const count = unreadCount(document.title);
      if (count === null) {
        // Titles can blink between states; only treat the count as cleared
        // once it has been gone for a while.
        noCountSince = noCountSince || Date.now();
        if (Date.now() - noCountSince > 10000) lastCount = 0;
        return;
      }
      noCountSince = null;
      const previous = lastCount;
      lastCount = count;
      // Ignore the first few seconds so opening Teams with messages already
      // unread doesn't send an alert.
      if (Date.now() - startedAt < 15000) return;
      if (count <= previous || document.hasFocus()) return;

      const changedAt = Date.now();
      setTimeout(() => {
        // Skip if a real notification (with sender/message) arrived around
        // the same time as the title change.
        if (lastRelayAt >= changedAt - 5000) return;
        relay("New activity", `${count} unread`, "title");
      }, 3000);
    }, 1000);
  }
})();
