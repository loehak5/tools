// Popup logic for Instagram Cookie Exporter
const elements = {
    loading: document.getElementById('loading'),
    notLoggedIn: document.getElementById('notLoggedIn'),
    accountInfo: document.getElementById('accountInfo'),
    profilePic: document.getElementById('profilePic'),
    fullName: document.getElementById('fullName'),
    username: document.getElementById('username'),
    followersCount: document.getElementById('followersCount'),
    followingCount: document.getElementById('followingCount'),
    postsCount: document.getElementById('postsCount'),
    bio: document.getElementById('bio'),
    proxyInput: document.getElementById('proxyInput'),
    notesInput: document.getElementById('notesInput'),
    exportBtn: document.getElementById('exportBtn'),
    success: document.getElementById('success')
};

let accountData = null;
let cookiesData = null;

// Initialize
async function init() {
    try {
        // Get cookies from background script
        const { cookies } = await chrome.runtime.sendMessage({ action: 'getCookies' });

        if (!cookies || !cookies.sessionid) {
            showNotLoggedIn();
            return;
        }

        cookiesData = cookies;

        // Fetch account data from Instagram API
        await fetchAccountData(cookies);

    } catch (error) {
        console.error('Initialization error:', error);
        showNotLoggedIn();
    }
}

function showNotLoggedIn() {
    elements.loading.style.display = 'none';
    elements.notLoggedIn.style.display = 'block';
}

async function fetchAccountData(cookies) {
    try {
        // Get current tab to ensure we're on Instagram
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.url.includes('instagram.com')) {
            showNotLoggedIn();
            return;
        }

        // Execute script in the page context to get user data
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Try to get user data from window object
                try {
                    const data = window._sharedData ||
                        window.__additionalDataLoaded ||
                        {};

                    // Get user from various possible locations
                    let user = null;

                    if (data.config && data.config.viewer) {
                        user = data.config.viewer;
                    } else if (data.entry_data) {
                        // Try profile page
                        if (data.entry_data.ProfilePage) {
                            user = data.entry_data.ProfilePage[0].graphql.user;
                        }
                        // Try main feed
                        else if (data.entry_data.FeedPage) {
                            user = data.entry_data.FeedPage[0].graphql.user;
                        }
                    }

                    // Fallback: try to get from HTML meta tags
                    if (!user) {
                        const usernameEl = document.querySelector('meta[property="al:ios:url"]');
                        if (usernameEl) {
                            const username = usernameEl.content.split('user?username=')[1];
                            if (username) {
                                // Minimal user data from meta tags
                                user = {
                                    username: username,
                                    full_name: username,
                                    profile_pic_url: '',
                                    edge_followed_by: { count: 0 },
                                    edge_follow: { count: 0 },
                                    edge_owner_to_timeline_media: { count: 0 },
                                    biography: ''
                                };
                            }
                        }
                    }

                    return user;
                } catch (e) {
                    console.error('Error extracting user data:', e);
                    return null;
                }
            }
        });

        const user = results[0].result;

        if (!user) {
            // Fallback: try to parse from cookies
            const userId = cookies.ds_user_id;
            const username = cookies.ds_user || 'unknown';

            accountData = {
                username: username,
                full_name: username,
                user_id: userId || '',
                followers_count: 0,
                following_count: 0,
                posts_count: 0,
                profile_pic_url: '',
                bio: '',
                is_verified: false,
                is_private: false
            };
        } else {
            // Parse user data
            accountData = {
                username: user.username || '',
                full_name: user.full_name || user.username || '',
                user_id: user.id || cookies.ds_user_id || '',
                followers_count: user.edge_followed_by?.count || 0,
                following_count: user.edge_follow?.count || 0,
                posts_count: user.edge_owner_to_timeline_media?.count || 0,
                profile_pic_url: user.profile_pic_url || '',
                bio: user.biography || '',
                is_verified: user.is_verified || false,
                is_private: user.is_private || false
            };
        }

        displayAccountInfo();

    } catch (error) {
        console.error('Error fetching account data:', error);

        // Fallback to minimal data from cookies
        accountData = {
            username: cookies.ds_user || 'unknown',
            full_name: cookies.ds_user || 'unknown',
            user_id: cookies.ds_user_id || '',
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            profile_pic_url: '',
            bio: '',
            is_verified: false,
            is_private: false
        };

        displayAccountInfo();
    }
}

function displayAccountInfo() {
    elements.loading.style.display = 'none';
    elements.accountInfo.style.display = 'block';

    // Set profile picture
    if (accountData.profile_pic_url) {
        elements.profilePic.src = accountData.profile_pic_url;
    } else {
        // Default avatar
        elements.profilePic.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23999"><circle cx="12" cy="8" r="4"/><path d="M20 19c0-4.4-3.6-8-8-8s-8 3.6-8 8"/></svg>';
    }

    elements.fullName.textContent = accountData.full_name;
    elements.username.textContent = '@' + accountData.username;
    elements.followersCount.textContent = formatNumber(accountData.followers_count);
    elements.followingCount.textContent = formatNumber(accountData.following_count);
    elements.postsCount.textContent = formatNumber(accountData.posts_count);

    if (accountData.bio) {
        elements.bio.textContent = accountData.bio;
        elements.bio.style.display = 'block';
    } else {
        elements.bio.style.display = 'none';
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Export cookies
elements.exportBtn.addEventListener('click', async () => {
    try {
        elements.exportBtn.disabled = true;
        elements.exportBtn.textContent = 'Exporting...';

        // Get user agent
        const userAgent = navigator.userAgent;

        // Build export data
        const exportData = {
            version: '1.0',
            exported_at: new Date().toISOString(),
            account: accountData,
            cookies: cookiesData,
            user_agent: userAgent,
            proxy: elements.proxyInput.value.trim() || '',
            notes: elements.notesInput.value.trim() || ''
        };

        // Create downloadable file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `instagram_${accountData.username}_${timestamp}.json`;

        // Trigger download
        await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: true
        });

        // Show success message
        elements.accountInfo.style.display = 'none';
        elements.success.style.display = 'block';

        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);

    } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
        elements.exportBtn.disabled = false;
        elements.exportBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>Export Cookies';
    }
});

// Start initialization
init();
