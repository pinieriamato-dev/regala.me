chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: 'add-regalame', title: 'Agregar a regala.me', contexts: ['page', 'link'] });
});

async function createItem(info) {
  const url = info.linkUrl || info.pageUrl;
  chrome.storage.sync.get(['token', 'wishlistId'], async ({ token, wishlistId }) => {
    if (!token || !wishlistId) return;
    await fetch('https://regala.me/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ wishlistId, url })
    });
  });
}

chrome.contextMenus.onClicked.addListener(createItem);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'page-info') {
    createItem({ pageUrl: msg.url });
  }
});
