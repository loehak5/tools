// Background service worker for cookie access
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCookies') {
        chrome.cookies.getAll({ domain: '.instagram.com' }, (cookies) => {
            const cookieObj = {};
            cookies.forEach(cookie => {
                cookieObj[cookie.name] = cookie.value;
            });
            sendResponse({ cookies: cookieObj });
        });
        return true; // Keep channel open for async response
    }
});
