# GitHub Branch Protection Configuration

This file documents the recommended configuration for protected branches on GitHub.

## 🛡️ Branch Protection: `main`

**Path on GitHub:** Settings → Branches → Branch protection rules → Add rule

### Configuration:

**Branch name pattern:** `main`

#### Protect matching branches:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: **1**
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional)
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Status checks found:**
    - `build (windows-latest)`
    - `build (ubuntu-latest)`
    - `lint`
    - `type-check`
  
- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (optional, but recommended)

- ✅ **Require linear history** (optional)

- ✅ **Do not allow bypassing the above settings**

#### Rules applied to everyone including administrators:
- ✅ **Restrict who can push to matching branches**
  - Only allow pushes from: `release/*` and `hotfix/*` branches
  
- ✅ **Block force pushes**

- ✅ **Block deletions**

---

## 🛡️ Branch Protection: `develop`

**Branch name pattern:** `develop`

#### Protect matching branches:
- ✅ **Require a pull request before merging**
  - Require approvals: **1** (can be 0 for small teams)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Status checks found:**
    - `build-dev (windows-latest)`
    - `build-dev (ubuntu-latest)`
    - `lint`
    - `type-check`
  
- ✅ **Require conversation resolution before merging**

#### Rules applied to everyone including administrators:
- ✅ **Block force pushes**

- ⚠️ **Block deletions** (recommended)

---

## 🔧 CI/CD Configuration

### GitHub Actions Settings

**Path:** Settings → Actions → General

#### Workflow permissions:
- ✅ **Read and write permissions**
- ✅ **Allow GitHub Actions to create and approve pull requests**

#### Fork pull request workflows:
- ⚠️ **Require approval for all outside collaborators**

---

## 🔐 Secrets and Variables

**Path:** Settings → Secrets and variables → Actions

### Required secrets:
- `GITHUB_TOKEN` (generated automatically)

### Optional variables:
- `NODE_VERSION`: `22` (or whichever version you use)

---

## 📋 Rulesets (Modern Alternative)

GitHub now offers "Rulesets" as an alternative to Branch Protection Rules.

**Path:** Settings → Rules → Rulesets → New ruleset

### Ruleset for `main` and `develop`:

**Ruleset name:** `Production Branches`

**Target branches:**
- `main`
- `develop`

**Rules:**
- ✅ Restrict creations
- ✅ Restrict updates
- ✅ Restrict deletions
- ✅ Require a pull request before merging
  - Required approvals: 1
- ✅ Require status checks to pass
- ✅ Block force pushes

**Bypass list:**
- None (apply to everyone, including admins)

---

## 🚀 Applying the Configuration

### Option 1: Web Interface
Follow the instructions above directly on GitHub.

### Option 2: GitHub CLI
```bash
# Protect the main branch
gh api repos/CeroCloud/CeroCloud-Desktop/branches/main/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f required_status_checks='{"strict":true,"contexts":["build (windows-latest)","build (ubuntu-latest)"]}' \
  -f enforce_admins=true \
  -f required_pull_request_reviews='{"dismissal_restrictions":{},"dismiss_stale_reviews":true,"require_code_owner_reviews":false,"required_approving_review_count":1}' \
  -f restrictions=null
```

### Option 3: Terraform (IaC)
```hcl
resource "github_branch_protection" "main" {
  repository_id = "CeroCloud-Desktop"
  pattern       = "main"
  
  required_status_checks {
    strict = true
    contexts = [
      "build (windows-latest)",
      "build (ubuntu-latest)",
    ]
  }
  
  required_pull_request_reviews {
    dismiss_stale_reviews           = true
    require_code_owner_reviews      = false
    required_approving_review_count = 1
  }
  
  enforce_admins = true
  
  restrict_pushes {
    blocks_creations = false
  }
}
```

---

## ✅ Configuration Checklist

Before starting team development:

- [ ] `main` branch protected with the rules above
- [ ] `develop` branch protected with the rules above
- [ ] CI/CD workflows active and working
- [ ] GitHub Actions permissions configured
- [ ] CODEOWNERS file created (optional)
- [ ] Branch ruleset applied (if you use rulesets)
- [ ] Gitflow documentation shared with the team
- [ ] Helper scripts available in `.github/`

---

## 📚 References

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [GitHub Actions Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication)

---

*Last updated: October 31, 2026*
