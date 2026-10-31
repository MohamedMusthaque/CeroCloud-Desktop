# 📦 Quick Guide: Create Your First Release with Auto-Update

**For:** NexoraCloud Desktop  
**Goal:** Publish v1.1.0 with a working auto-update system

---

## 🎯 Prerequisites

Before you begin, make sure you have:

- ✅ Node.js v20+ installed
- ✅ Git configured
- ✅ Access to the GitHub repository (push access)
- ✅ The project compiling without errors (`npm run type-check`)

---

## 📋 Step by Step

### 1️⃣ **Prepare the New Version**

```bash
# Go to the project directory
cd C:\Users\danie\Desktop\CeroCloud-Desktop

# Update the version in package.json
npm version minor
# This changes 1.0.0 → 1.1.0
# and creates a commit automatically

# Expected result:
# v1.1.0
```

### 2️⃣ **Update the Changelog**

Edit `changelog.md` and add:

```markdown
## [1.1.0] – 2026-01-XX 🎉 **AUTO-UPDATE SYSTEM**

### Added - ✅ **Built-in Auto-Update**
- ✅ Automatic check every 6 hours
- ✅ Elegant notifications with Sonner toasts
- ✅ Background download with a progress bar
- ✅ Optional installation (not forced)
- ✅ GitHub Releases support
- ✅ Detailed logs for debugging

### Technical
- Added `electron-updater` and `electron-log`
- New `AutoUpdateService` in the main process
- `UpdateNotifier` component for the UI
- Complete API in the preload script
```

Save the file.

### 3️⃣ **Commit and Push**

```bash
# Add the changelog
git add changelog.md

# Commit
git commit -m "docs: update changelog for v1.1.0"

# Push to main (or develop, depending on your workflow)
git push origin main

# Push the tag
git push origin v1.1.0
```

### 4️⃣ **Build the Application**

```bash
# Build for Windows
npm run build:win

# This generates, in the 'release' folder:
# - NexoraCloud Setup 1.1.0.exe (~80-120 MB)
# - latest.yml (metadata for the auto-updater)
```

**⏱️ Estimated time:** 2-5 minutes depending on your PC.

**📁 Generated files:**
```
release/
  ├── NexoraCloud Setup 1.1.0.exe   ← Main installer
  └── latest.yml                   ← Update metadata
```

### 5️⃣ **Create the Release on GitHub**

#### Option A: Web Interface (Recommended)

1. Go to: https://github.com/CeroCloud/CeroCloud-Desktop/releases

2. Click **"Draft a new release"**

3. Fill in the form:
   ```
   Tag version: v1.1.0
   Release title: v1.1.0 - Auto-Update & Improvements
   
   Description:
   ## 🎉 What's New
   
   ### Auto-Update System
   NexoraCloud now updates itself automatically:
   - ✅ Notifications about new versions
   - ✅ Background download
   - ✅ Installation without interrupting your work
   
   ### Technical Improvements
   - Checks every 6 hours
   - Detailed logs in `%APPDATA%\nexoracloud\logs`
   - Compatible with GitHub Releases
   
   ## 📥 Download
   Download the Windows installer below.
   
   ## 🔄 Updating from v1.0.0
   If you already have NexoraCloud installed:
   1. The app will notify you automatically
   2. Click "Download"
   3. Wait for the download
   4. Click "Install and Restart"
   
   ## 📝 Full Changelog
   See [changelog.md](https://github.com/CeroCloud/CeroCloud-Desktop/blob/main/changelog.md)
   ```

4. **Upload the files:**
   - Drag `NexoraCloud Setup 1.1.0.exe` into the assets area
   - Drag `latest.yml` into the assets area

5. Mark it as "**Latest release**" (checkbox)

6. Click **"Publish release"**

#### Option B: GitHub CLI (Advanced)

```bash
# Install the gh CLI if you don't have it
# https://cli.github.com/

# Authenticate
gh auth login

# Create the release
gh release create v1.1.0 \
  --title "v1.1.0 - Auto-Update & Improvements" \
  --notes "Built-in auto-update system. See the changelog for details." \
  "release/NexoraCloud Setup 1.1.0.exe#NexoraCloud-Setup-1.1.0.exe" \
  "release/latest.yml#latest.yml"
```

### 6️⃣ **Verify the Release**

1. Go to the published release:
   ```
   https://github.com/CeroCloud/CeroCloud-Desktop/releases/tag/v1.1.0
   ```

2. Check that these appear:
   - ✅ Tag: `v1.1.0`
   - ✅ File: `NexoraCloud-Setup-1.1.0.exe` (~80-120 MB)
   - ✅ File: `latest.yml` (~1 KB)
   - ✅ Release description

---

## 🧪 Testing the Auto-Update

### Simulate an Update (Local Testing)

To verify that it works:

1. **Install the OLD (simulated) version:**
   ```bash
   # Temporarily change the version to 1.0.9
   # In package.json: "version": "1.0.9"
   
   npm run build:win
   # Install this .exe
   ```

2. **Run the installed app**
   - Wait 5 seconds
   - It should show: "🎉 New version 1.1.0 available!"

3. **Download and Install**
   - Click "Download"
   - Wait for the download (you will see the progress bar)
   - Click "Install and Restart"
   - The app closes, updates and reopens with v1.1.0

### View the Logs

```powershell
# In PowerShell
Get-Content "$env:APPDATA\nexoracloud\logs\main.log" -Tail 30

# Look for lines like:
# Checking for updates...
# Update available: 1.1.0
# Downloading: 45.20% - ...
# Update downloaded: 1.1.0
```

---

## 🎨 Screenshots for the Release (Optional)

To make the release more appealing, you can add screenshots:

### Screenshot 1: Update Notification
![update-notification](screenshots/update-notification.png)

### Screenshot 2: Progress Bar
![update-download](screenshots/update-download.png)

Upload the images in the release description using:
```markdown
![Description](Image_URL)
```

---

## ⚠️ Common Problems

### "Latest.yml not found"
**Cause:** electron-builder did not generate it.

**Solution:**
```bash
# Make sure package.json has:
"build": {
  "publish": {
    "provider": "github",
    "releaseType": "release"
  }
}

# Rebuild
npm run build:win
```

### "Update check failed"
**Cause:** The repository is private or you don't have permissions.

**Solution:**
- Make sure the repo is **public** on GitHub
- Or configure a GitHub Token (see `docs/AUTO_UPDATE.md`)

### "SmartScreen warning" on Windows
**Cause:** The .exe is not digitally signed.

**Solution (temporary):**
- Users can click "More info" → "Run anyway"

**Solution (permanent):**
- Get a code-signing certificate (Sectigo, DigiCert)
- See: the "Code Signing" section of `docs/AUTO_UPDATE.md`

---

## 📊 Final Checklist

Before publishing, check:

- [ ] Version updated in `package.json` (1.1.0)
- [ ] Changelog updated
- [ ] Commit and push done
- [ ] Tag `v1.1.0` created and pushed
- [ ] Build completed successfully
- [ ] `.exe` and `latest.yml` files generated
- [ ] Release created on GitHub
- [ ] Assets uploaded correctly
- [ ] Release marked as "Latest"
- [ ] Release description complete

---

## 🎉 Done!

Now every user with NexoraCloud installed will get an automatic notification when v1.1.0 is available.

### Next time (simpler):

```bash
npm version patch  # 1.1.0 → 1.1.1
git push origin main v1.1.1
npm run build:win
# Create the release on GitHub with the files
```

---

## 🆘 Need Help?

- 📖 **Full Documentation:** `docs/AUTO_UPDATE.md`
- 📝 **Feature Summary:** `docs/FEATURE_AUTO_UPDATE_SUMMARY.md`
- 🐛 **Issues:** https://github.com/CeroCloud/CeroCloud-Desktop/issues
- 📧 **Email:** proyectogit22@gmail.com

---

**Did everything work? Congratulations, you just implemented auto-updates in your Electron app! 🚀**
