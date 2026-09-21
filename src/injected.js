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
  PatchedNotification.permission = OriginalNotification.permission;
  PatchedNotification.requestPermission =
    OriginalNotification.requestPermission.bind(OriginalNotification);
  PatchedNotification.__waTelegramBridged = true;

  window.Notification = PatchedNotification;
})();
