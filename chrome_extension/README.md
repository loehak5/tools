# Instagram Cookie Exporter - Chrome Extension

## 🚀 Quick Start Guide

### Installation

1. **Download or Clone** the extension files from `chrome_extension/` directory

2. **Load in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome_extension` folder

3. **Pin the Extension:**
   - Click the puzzle icon in Chrome toolbar
   - Find "Instagram Cookie Exporter"
   - Click the pin icon to keep it visible

### Usage

1. **Login to Instagram:**
   - Go to [instagram.com](https://www.instagram.com)
   - Login with your account
   - Navigate to your profile or feed

2. **Export Cookies:**
   - Click the extension icon  
   - The extension will automatically detect your logged-in account
   - Review your account info (followers, bio, etc.)
   - Optionally add:
     - **Proxy** - If you want to use a specific proxy for this account
     - **Notes** - Description or tags for easy identification
   - Click "Export Cookies" button
   - Save the JSON file

3. **Import to Automation Tool:**
   - Go to your Instagram automation tool
   - Navigate to "Cookie Import" page (or Accounts → Import Cookies)
   - Drag and drop the exported JSON file(s)
   - Review the accounts to import
   - Click "Import" to add them

## 📋 Export File Format

The extension exports a JSON file with this structure:

```json
{
  "version": "1.0",
  "exported_at": "2026-02-06T09:53:00Z",
  "account": {
    "username": "your_username",
    "full_name": "Your Name",
    "user_id": "123456789",
    "followers_count": 1234,
    "following_count": 567,
    "posts_count": 89,
    "profile_pic_url": "https://...",
    "bio": "Your bio",
    "is_verified": false,
    "is_private": false
  },
  "cookies": {
    "sessionid": "...",
    "ds_user_id": "...",
    "csrftoken": "...",
    "mid": "...",
    "ig_did": "...",
    "rur": "..."
  },
  "user_agent": "Mozilla/5.0...",
  "proxy": "",  
  "notes": ""
}
```

## ✅ Benefits of Cookie-Based Login

vs. Password-Based Login:

| Cookie-Based | Password-Based |
|---|---|
| ✅ No API login required | ❌ Triggers security checks |
| ✅ Reuses existing session | ❌ Creates new session |
| ✅ Less suspicious to Instagram | ❌ May trigger 2FA/challenges |
| ✅ Faster setup | ❌ Slower (login delays) |
| ✅ No password storage needed | ❌ Requires password handling |

## 🔧 Troubleshooting

**Extension shows "Not Logged In":**
- Make sure you're logged into Instagram in the current tab
- Refresh the Instagram page
- Try logging out and logging back in
- Clear browser cache if needed

**No account data showing:**
- Navigate to your Instagram profile or feed first
- The extension needs to be on an Instagram page
- Some data may not be available on all pages

**Download not starting:**
- Check if Chrome blocked the download
- Look for download icon in address bar
- Check Chrome's download settings

**Cookies expired quickly:**
- Instagram sessions do expire periodically
- Re-export cookies when needed
- The automation tool will notify you if session expires

## 🔐 Privacy & Security

- ✅ All data stays local - nothing is sent to external servers
- ✅ Cookies are only exported when you click the button
- ✅ No tracking or analytics
- ✅ Open source - you can review the code

## 📝 Tips

1. **Organize Your Exports:**
   - Use meaningful names when saving files
   - Add notes to identify accounts easily
   - Keep exports in a dedicated folder

2. **Batch Import:**
   - Export multiple accounts
   - Save all JSON files in one folder
   - Drag and drop all at once to import

3. **Session Management:**
   - Re-export cookies if tasks fail with "login_required"
   - Keep Instagram logged in while automation is running
   - Don't logout from Instagram after exporting

4. **Proxy Configuration:**
   - Add proxy during export for convenience
   - Or set it later in the automation tool
   - Use consistent proxy per account for best results

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console logs (F12 → Console tab)
3. Report issues with:
   - Chrome version
   - Instagram page you were on
   - Any error messages in console
