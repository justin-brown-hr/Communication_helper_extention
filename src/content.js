// Bridges window.postMessage events from injected.js (page context)
// to the extension's background service worker.
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== "wa-telegram-bridge") return;

  console.log("[wa-telegram-bridge] relaying to background:", data.title);
  chrome.runtime.sendMessage({
    type: "wa-notification",
    title: data.title,
    body: data.body,
  });
});
