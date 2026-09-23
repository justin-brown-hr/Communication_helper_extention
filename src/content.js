// Bridges window.postMessage events from injected.js (page context)
// to the extension's background service worker.
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "wa-telegram-bridge") return;

  // If the extension was reloaded/updated since this page loaded, this
  // content script is orphaned and chrome.runtime is torn down — any call
  // into it throws "Extension context invalidated." Reloading the WhatsApp
  // tab re-injects a fresh, connected content script.
  if (!chrome.runtime?.id) {
    console.warn(
      "[wa-telegram-bridge] extension context invalidated — reload this tab to reconnect."
    );
    return;
  }

  console.log("[wa-telegram-bridge] relaying to background:", data.title);
  try {
    chrome.runtime.sendMessage({
      type: "wa-notification",
      title: data.title,
      body: data.body,
    });
  } catch (err) {
    console.warn(
      "[wa-telegram-bridge] failed to relay (reload this tab to reconnect):",
      err
    );
  }
});
