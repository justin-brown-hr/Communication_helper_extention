// Runs in the page's own JS context (world: "MAIN") on WhatsApp Web and
// Microsoft Teams (web). Both apps call the native Notification API (or a
// service worker's showNotification) for every new message when the tab is
// backgrounded. We intercept those calls so we can forward the alert to our
// content script without touching the app's DOM.
(function () {
  const app = location.hostname.includes("whatsapp") ? "whatsapp" : "teams";

  function relay(title, options) {
    try {
      console.log("[wa-telegram-bridge] intercepted notification:", app, title, options);
      window.postMessage(
        {
          source: "wa-telegram-bridge",
          app,
          title: title || "",
          body: (options && options.body) || "",
        },
        "*"
      );
    } catch (err) {
      // Never let bridging break the app's own notification.
    }
  }

  const OriginalNotification = window.Notification;
  if (OriginalNotification && !OriginalNotification.__waTelegramBridged) {
    function PatchedNotification(title, options) {
      relay(title, options);
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

  // Teams (and sometimes WhatsApp) may show notifications through their
  // service worker registration instead of `new Notification(...)`.
  const SWR = window.ServiceWorkerRegistration;
  if (SWR && SWR.prototype.showNotification && !SWR.prototype.__waTelegramBridged) {
    const originalShow = SWR.prototype.showNotification;
    SWR.prototype.showNotification = function (title, options) {
      relay(title, options);
      return originalShow.call(this, title, options);
    };
    SWR.prototype.__waTelegramBridged = true;
  }
})();
