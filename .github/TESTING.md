# 🔧 Release Diagnostic and Test Scripts

This directory contains PowerShell scripts to diagnose and test the automatic release system.

## 📋 Available Scripts

### 1. `diagnose.ps1` - Full Diagnostics
**Purpose:** Checks the whole project configuration and detects common problems.

```powershell
.\diagnose.ps1
```

**What it checks:**
- ✅ Git configuration
- ✅ Node.js and npm versions
- ✅ package.json configuration
- ✅ Installed semantic-release plugins
- ✅ The .releaserc.json file
- ✅ Build directories
- ✅ GitHub Actions workflows
- ✅ Analysis of commits since the last tag
- ✅ Common problems

**Run this script FIRST** to get an overview.

---

### 2. `validate-commits.ps1` - Commit Validation
**Purpose:** Checks that your commits follow the Conventional Commits format required by semantic-release.

```powershell
.\validate-commits.ps1
```

**What it does:**
- 📝 Analyzes the last 10 commits
- ✅ Identifies valid commits (feat, fix, docs, etc.)
- ❌ Identifies invalid commits
- 💡 Shows examples of the correct format

**Correct commit format:**
```
feat: add new feature                   # Bumps the MINOR version
fix: fix bug                            # Bumps the PATCH version
fix(hotfix): urgent fix                 # PATCH with a scope
chore: update dependencies              # No version bump
docs: update documentation              # No version bump

# For incompatible changes (MAJOR version):
feat!: change that breaks compatibility
# Or in the commit body:
feat: new feature

BREAKING CHANGE: description of the incompatible change
```

---

### 3. `test-release.ps1` - Local Release Test
**Purpose:** Runs semantic-release in DRY-RUN mode (without publishing anything).

```powershell
.\test-release.ps1
```

**What it does:**
- 🧪 Simulates the release process
- 🔍 Analyzes commits and determines the next version
- 📝 Shows which files would be created/modified
- ❌ Publishes NOTHING (it is safe to run)

**Run this script** after validating the commits to see whether the release would work.

---

## 🚀 Recommended Workflow

### For Hotfixes:

```powershell
# 1. Create the hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/v1.1.2

# 2. Make your fixes
# ... edit files ...

# 3. Commit with the correct format
git add .
git commit -m "fix: fix critical auto-update error"

# 4. Validate the commit
.\validate-commits.ps1

# 5. Test the release locally
.\test-release.ps1

# 6. If everything is OK, merge into main
git checkout main
git merge hotfix/v1.1.2 --no-ff
git push origin main

# 7. GitHub Actions takes care of the rest
```

### For Normal Development:

```powershell
# 1. Work on develop
git checkout develop
git pull origin develop

# 2. Create a feature branch
git checkout -b feature/new-feature

# 3. Commit with the correct format
git commit -m "feat: add report export"

# 4. Validate before pushing
.\validate-commits.ps1

# 5. Merge into develop
git checkout develop
git merge feature/new-feature
git push origin develop

# 6. GitHub Actions creates a beta release
```

---

## ❌ Common Problems and Solutions

### Error: "Process completed with exit code 1"

**Possible causes:**

1. **No valid commits for a release**
   - Solution: Check with `.\validate-commits.ps1`
   - Make sure you use `feat:` or `fix:` in the commits

2. **Missing npm plugins**
   - Solution: `npm ci` to reinstall the dependencies

3. **The build fails during the process**
   - Solution: Try `npm run type-check && npx vite build`

4. **GITHUB_TOKEN without permissions**
   - Solution: Check in GitHub Actions that the token has write permissions

### Error: "No release published"

This is NOT an error. It means that:
- There are no `feat:` or `fix:` commits since the last release
- All the commits are `chore:`, `docs:`, etc. (they don't bump the version)

### Error: The build fails when creating binaries

```powershell
# Check that electron-builder works locally:
npm run type-check
npx vite build
npx electron-builder --win
```

---

## 📊 Reading the Output

### validate-commits.ps1
```
✨ [abc123] feat: new feature            # Will bump the MINOR version
🐛 [def456] fix: bug fix                 # Will bump the PATCH version
🔧 [ghi789] chore: update deps           # Does NOT bump the version
❌ [jkl012] various changes              # INVALID - will not generate a release
```

### test-release.ps1
```
[semantic-release] › ℹ  Analysis of 5 commits complete: minor release
[semantic-release] › ℹ  The next release version is 1.2.0
```

---

## 🔗 Useful Links

- [Semantic Release Docs](https://semantic-release.gitbook.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions - semantic-release](https://github.com/semantic-release/semantic-release/blob/master/docs/recipes/ci-configurations/github-actions.md)

---

## 💡 Tips

- **Always run `.\diagnose.ps1` first** when you have problems
- **Use `.\validate-commits.ps1`** before every important push
- **Test with `.\test-release.ps1`** before merging into main/develop
- Merge commits don't need to follow Conventional Commits
- Use `git commit --amend` to fix the last commit if you forgot the format

---

## 🆘 Need Help?

1. Run `.\diagnose.ps1` and share the output
2. Run `.\validate-commits.ps1` to check the commits
3. Check the GitHub Actions logs for the specific error
