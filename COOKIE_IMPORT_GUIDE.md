# Cookie-Based Account Import - User Guide

## Why Use Cookie-Based Import?

Cookie-based authentication is **significantly more reliable** than password-based login for Instagram automation:

### Advantages
- ✅ **No Instagram API Login** - Doesn't trigger security measures
- ✅ **Faster Setup** - No waiting for login delays
- ✅ **Lower Risk** - Reuses existing sessions instead of creating new ones
- ✅ **No 2FA Hassle** - Skip verification challenges
- ✅ **Easier Management** - Export 100+ accounts in minutes

### How It Works
1. You login to Instagram normally in your browser
2. Chrome extension exports your session cookies
3. Import cookies into the automation tool
4. Tool reuses your authenticated session

---

## Step 1: Install Chrome Extension

### Download & Install

1. Navigate to `tools-ig/chrome_extension/` directory
2. Open Chrome and go to **chrome://extensions/**
3. Enable **Developer mode** (toggle in top-right)
4. Click **"Load unpacked"**
5. Select the `chrome_extension` folder
6. Pin the extension to your toolbar for easy access

---

## Step 2: Export Cookies

### For Each Account:

1. **Login to Instagram**
   - Go to instagram.com
   - Login with the account you want to export
   - Navigate to your profile or feed

2. **Click Extension Icon**
   - The extension will auto-detect your account
   - You'll see your profile info: username, followers, etc.

3. **Add Optional Info**
   - **Proxy:** If you want to use a specific proxy for this account
   - **Notes:** Add tags or description for easy identification

4. **Export**
   - Click "Export Cookies" button
   - Save the JSON file with a meaningful name (e.g., `username_2026-02-06.json`)

5. **Repeat** for each account you want to add

### Batch Export Tips
- Keep all exported JSON files in one folder
- Use consistent naming: `username_date.json`
- Add notes to identify account purpose (e.g., "main", "backup", "story-only")

---

## Step 3: Import to Automation Tool

### Via Web Interface:

1. **Navigate to Import Page**
   - Open your automation tool dashboard
   - Go to **Accounts** → **Import Cookies** button
   - Or navigate to `/cookie-import` page

2. **Upload Files**
   - Drag and drop JSON file(s) into the upload zone
   - Or click to browse and select files
   - Multiple files can be imported at once

3. **Review Accounts**
   - Preview shows username, followers, profile pic
   - Green = ready to import
   - Yellow = already exists (will be skipped)
   - Red = invalid file format

4. **Configure (Optional)**
   - Update proxy if needed
   - Edit notes
   - Select which accounts to import (or all)

5. **Import**
   - Click "Import Selected" or "Import All"
   - Wait for progress indicator
   - Success! Accounts are ready to use

---

## Step 4: Verify & Use

### Check Account Status

1. Go to **Accounts** page
2. Look for newly imported accounts
3. Status should be **"active"** (green)
4. If status is "offline" or "expired":
   - Click account → "Check Session"
   - Or re-export and re-import cookies

### Create Tasks

1. Select an imported account
2. Create task (Story, Post, Like, Follow, View)
3. Execute - should work without "login_required" errors!

---

## Troubleshooting

### "Not Logged In" in Extension
- **Cause:** You're not logged into Instagram in current tab
- **Fix:** Login to Instagram first, then click extension

### Export Shows Wrong Account
- **Cause:** Multiple Instagram accounts logged in
- **Fix:** Use Chrome profiles or incognito windows to separate accounts

### Import Shows "Already Exists"
- **Cause:** Username already in database
- **Fix:** Delete old account first, or skip this import

### Tasks Still Fail with "login_required"
- **Cause:** Cookies have expired
- **Fix:** 
  1. Re-login to Instagram
  2. Re-export cookies with extension
  3. Delete old account from tool
  4. Import fresh cookies

### Session Expired Quickly
- **Cause:** Instagram detects suspicious activity
- **Fix:**
  - Use consistent proxy per account
  - Don't logout from Instagram after export
  - Reduce task frequency
  - Add delays between tasks

---

## Best Practices

### For Maximum Reliability:

1. **One Account Per Chrome Profile**
   - Use Chrome profiles to manage multiple Instagram accounts
   - Export each from its own profile
   - Prevents session conflicts

2. **Consistent Proxy Usage**
   - Assign same proxy to same account always
   - Don't switch IPs frequently
   - Use residential proxies if possible

3. **Regular Re-exports**
   - Re-export cookies every 7-14 days
   - Or when you see "login_required" errors
   - Keep Instagram logged in during automation

4. **Organized File Management**
```
cookies-export/
├── main-accounts/
│   ├── username1_2026-02-06.json
│   ├── username2_2026-02-06.json
├── backup-accounts/
│   ├── username3_2026-02-06.json
└── story-only/
    ├── username4_2026-02-06.json
```

5. **Batch Operations**
   - Export all accounts at once (one session per account)
   - Import all at once
   - Test one account first before mass operations

---

## Security Notes

- ✅ Cookies are stored securely in database
- ✅ Extension doesn't send data externally
- ✅ No passwords are needed or stored
- ⚠️ Keep exported JSON files private (they contain session data)
- ⚠️ Don't share cookies - they grant full account access

---

## Quick Reference

| Action | Steps |
|---|---|
| Install Extension | Extensions → Developer Mode → Load Unpacked |
| Export Cookie | Instagram → Extension Icon → Export |
| Import Single | Accounts → Import → Upload JSON |
| Import Batch | Accounts → Import → Upload Multiple JSONs |
| Re-export Expired | Login Instagram → Extension → Export → Re-import |

---

## Support

Need help?
1. Check Troubleshooting section
2. Review README in `chrome_extension/` folder
3. Verify JSON file format is correct
4. Check browser console for errors (F12)
