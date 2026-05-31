document.getElementById('save').onclick = () => {
  const token = document.getElementById('token').value;
  const wishlistId = document.getElementById('wishlist').value;
  chrome.storage.sync.set({ token, wishlistId });
};

document.getElementById('add').onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, 'get-page-info', info => {
      chrome.storage.sync.get(['token', 'wishlistId'], ({ token, wishlistId }) => {
        fetch('https://regala.me/api/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ wishlistId, url: info.url, title: info.title })
        });
      });
    });
  });
};
