// Runs in the WhatsApp Web page's own JS context (world: "MAIN").
// WhatsApp Web already calls the native Notification API for every new
// message when the tab is backgrounded. We intercept that call so we can
// forward the alert to our content script without touching WhatsApp's DOM.
(function () {
  const OriginalNotification = window.Notification;
  if (!OriginalNotification || OriginalNotification.__waTelegramBridged) {
    return;
  }

  function PatchedNotification(title, options) {
    try {
      console.log("[wa-telegram-bridge] intercepted notification:", title, options);
      window.postMessage(
        {
          source: "wa-telegram-bridge",
          title: title || "",
          body: (options && options.body) || "",
        },
        "*"
      );
    } catch (err) {
      // Never let bridging break WhatsApp's own notification.
    }
    return new OriginalNotification(title, options);
  }

  PatchedNotification.prototype = OriginalNotification.prototype;
  // A live getter, not a copied string: WhatsApp checks Notification.permission
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
})();
