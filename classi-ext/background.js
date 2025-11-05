// Handles cross-origin fetches for Dark Reader to comply with site CSP.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'darkreaderFetch') {
    return undefined;
  }

  (async () => {
    try {
      const response = await fetch(message.url, {
        credentials: 'include',
        cache: 'no-cache'
      });
      const buffer = await response.arrayBuffer();
      const headers = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      sendResponse({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers,
        body: buffer
      });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  })();

  return true;
});
