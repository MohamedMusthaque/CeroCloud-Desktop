# 📍 Where to Find Updates - NexoraCloud

## 🎯 Quick Answer

Users can see and manage updates in **TWO places**:

---

## 1️⃣ **Automatically (No action needed)**

Update notifications appear **automatically** every 6 hours:

```
┌─────────────────────────────────────┐
│  🎉 New version 1.2.0 available!     │
│                                       │
│  [Download]  [✕]                     │
└─────────────────────────────────────┘
```

**Location:** Toast in the top-right corner

**No action required** - The app checks for you.

---

## 2️⃣ **Manually (Whenever the user wants)**

### 📍 **Location: Settings → Updates**

**Steps:**
1. Open NexoraCloud
2. Go to the side menu
3. Click "⚙️ **Settings**" (last item in the menu)
4. Click the "**Updates** 🔄" tab

---

### ✨ What can the user do there?

#### **See the Current Version**
```
┌──────────────────────────────────────┐
│  CURRENT VERSION                      │
│  v1.0.0                            📦 │
│                                       │
│  You are using the latest version    │
└──────────────────────────────────────┘
```

#### **Check Manually**
```
┌──────────────────────────────────────┐
│  🔄 Check Now                         │
│                                       │
│  Manually check whether new versions  │
│  are available.                       │
│                                       │
│  [🔄 Check for Updates]              │
└──────────────────────────────────────┘
```

#### **Turn Automatic Checks On/Off**
```
┌──────────────────────────────────────┐
│  🛡️ Auto-updates                [ON]  │
│                                       │
│  NexoraCloud checks for new versions  │
│  automatically every 6 hours.         │
└──────────────────────────────────────┘
```

#### **Download a New Version** (when available)
```
┌──────────────────────────────────────┐
│  🎉 New version 1.2.0 available      │
│  v1.2.0 • 08/01/2026                  │
│                                       │
│  [Download] ←── Click here           │
└──────────────────────────────────────┘
```

---

## 🖼️ Screenshot (Visual)

```
Sidebar:
┌──────────────────┐
│  📊 Dashboard    │
│  📦 Inventory    │
│  💰 Sales        │
│  📈 Reports      │
│  ⚙️  Settings     │ ← Click here
└──────────────────┘

Then in Settings:
┌──────────────────────────────────────────────┐
│  General  |  Sales  |  Backups               │
│  🔄 Updates  |  Appearance                    │ ← Click here
└──────────────────────────────────────────────┘
```

---

## 📱 Complete User Flow

### **Option A: Wait (Recommended)**
1. The user uses the app normally
2. Every 6 hours, the app checks automatically
3. If there is an update → A toast appears
4. The user clicks "Download"
5. A progress bar shows the download
6. When it finishes → "Install and Restart"
7. Done! The app is updated

### **Option B: Check Manually**
1. Go to `Settings → Updates`
2. Click "🔄 Check for Updates"
3. Wait 2-3 seconds
4. See the result:
   - ✅ "You are already on the latest version" (no updates)
   - 🎉 "New version available" (an update exists)
5. If there is an update → Click "Download"
6. Follow the normal flow

---

## 🎨 Features of the Updates UI

### ✨ **What it DOES include:**

- ✅ Large, visible current version (gradient card)
- ✅ Manual "Check for Updates" button
- ✅ Toggle to turn automatic checks on/off
- ✅ Download status indicator
- ✅ New version information (number and date)
- ✅ Link to GitHub Releases to see the changelog
- ✅ Informational notices (security, silent download, etc.)
- ✅ Warning when running in development mode

### ✅ **Premium Design:**
- Indigo-purple gradient card for the current version
- Animated icons
- Loading states
- Confirmation toasts
- Responsive (works at any screen size)

---

## 🚀 Current Status

- ✅ **Implemented:** "Updates" tab in Settings
- ✅ **Working:** Manual check button
- ✅ **Visible:** Current version displayed
- ✅ **Interactive:** Auto-update toggle
- ✅ **Integrated:** With the global toast system

---

## ⚠️ Important Note (Development Mode)

In development mode (`npm run dev`), the tab shows:

```
┌────────────────────────────────────────────┐
│  ⚠️ Development Mode                        │
│                                             │
│  The auto-updater only works in packaged    │
│  versions (builds). In development mode,    │
│  this feature is disabled.                  │
└────────────────────────────────────────────┘
```

**Only works in production** → When you run `npm run build:win`

---

## 📊 Ultra-Quick Summary

| Where? | How? | When? |
|---------|--------|----------|
| **Automatic toasts** | No action needed | Every 6 hours |
| **Settings → Updates** | Manual click | Whenever the user wants |

---

**For the End User:**
> "Go to **Settings** in the side menu, then click the **Updates** tab. There you can see your current version and check for new versions manually."

---

**Implemented:** January 8, 2026  
**Commit:** Feature/auto-update-ui-settings
