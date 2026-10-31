# 🔧 Fix: Wine Error on the Linux Runner

## ❌ Problem Found

```
⨯ wine is required
⨯ app-builder process failed ERR_ELECTRON_BUILDER_CANNOT_EXECUTE
Exit code: 1
```

**Cause:** The Linux GitHub Actions runner was trying to build Windows binaries, but Wine was not installed.

---

## ✅ Solution Implemented

### Change 1: `.releaserc.json`
**Before:**
```json
"prepareCmd": "npm run type-check && npx vite build && npx electron-builder --win --linux"
```

**After:**
```json
"prepareCmd": "npm run type-check && npx vite build && npx electron-builder --linux"
```

➜ **It now builds only Linux** on the Ubuntu runner

---

### Change 2: New `build-windows.yml` Workflow

A workflow was created that runs **after** semantic-release creates the release:

```yaml
on:
  release:
    types: [published]

jobs:
  build-windows:
    runs-on: windows-latest  # ✅ Native Windows
```

**Flow:**
1. Semantic-release creates the release with the Linux binaries
2. The `release.published` event fires
3. The Windows runner builds the Windows binaries
4. It uploads them automatically to the same release

---

## 🚀 How It Will Work Now

### On the `develop` branch:

```
1. Push to develop
   ↓
2. CI: Lint + Type Check + Build ✅
   ↓
3. Develop Build:
   - Build Windows (validation only) ✅
   - Build Ubuntu (validation only) ✅
   ↓
4. Beta Pre-release (ubuntu-latest):
   - Semantic Release ✅
   - Updates the changelog ✅
   - Updates package.json ✅
   - Builds Linux (AppImage + .deb) ✅
   - Creates release v1.x.x-beta.1 ✅
   ↓
5. Build Windows (windows-latest):
   - Fires automatically ✅
   - Builds Windows (.exe) ✅
   - Uploads to the same release ✅
```

---

## 📋 Modified Files

1. **`.releaserc.json`**
   - Change: `--win --linux` → `--linux`
   - Reason: Only build Linux on the Linux runner

2. **`.github/workflows/build-windows.yml`** (NEW)
   - Workflow that runs when a release is published
   - Builds Windows binaries on a Windows runner
   - Uploads them to the release automatically

---

## 🧪 Next Steps

```powershell
# Commit the changes
git add .releaserc.json .github/workflows/build-windows.yml
git commit -m "fix: move the Windows build into a dedicated workflow

- Remove --win from semantic-release (Linux only)
- Create build-windows.yml to build Windows after the release
- This avoids the Wine error on the Linux runner"

# Push
git push origin develop
```

---

## 🎯 Expected Result

When you push to `develop`:

1. **Beta Pre-release** will create:
   - ✅ `v1.1.1-beta.1` tag
   - ✅ Release on GitHub
   - ✅ `NexoraCloud-1.1.1-beta.1.AppImage` (Linux)
   - ✅ `nexoracloud_1.1.1-beta.1_amd64.deb` (Linux)
   - ✅ `latest-linux.yml` (auto-update)

2. **Build Windows** (automatic, afterwards) will add:
   - ✅ `NexoraCloud-Setup-1.1.1-beta.1.exe` (Windows)
   - ✅ `latest.yml` (auto-update)

---

## ⏱️ Estimated Time

- Semantic Release + Linux build: ~5 minutes
- Windows build (afterwards): ~3-5 minutes
- **Total: ~10 minutes** to have every binary

---

## 💡 Advantages of This Solution

1. ✅ **No Wine needed** - each platform builds on its native runner
2. ✅ **Faster** - builds run in parallel (after the release)
3. ✅ **More reliable** - no emulation dependencies
4. ✅ **Easy to maintain** - separate, clear workflows
5. ✅ **Every binary in a single release** - a seamless experience for users
