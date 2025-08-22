chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === 'get-page-info') {
    const title = document.title;
    const image = document.querySelector('meta[property="og:image"]')?.content;
    sendResponse({ url: location.href, title, image });
  }
});
