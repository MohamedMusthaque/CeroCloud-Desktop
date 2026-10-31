# Full diagnostic script

Write-Host "🔧 Release System Diagnostics" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# 1. Check Git
Write-Host "1️⃣  Git Configuration" -ForegroundColor Yellow
Write-Host "   Repository: " -NoNewline
git remote get-url origin
Write-Host "   User: " -NoNewline
git config user.name
Write-Host "   Email: " -NoNewline
git config user.email
Write-Host "   Branch: " -NoNewline
git rev-parse --abbrev-ref HEAD

# 2. Check Node and npm
Write-Host "`n2️⃣  Node.js Environment" -ForegroundColor Yellow
Write-Host "   Node: " -NoNewline
node --version
Write-Host "   npm: " -NoNewline
npm --version

# 3. Check package.json
Write-Host "`n3️⃣  Package Configuration" -ForegroundColor Yellow
$pkg = Get-Content "package.json" -Raw | ConvertFrom-Json
Write-Host "   Name: $($pkg.name)" -ForegroundColor White
Write-Host "   Version: $($pkg.version)" -ForegroundColor White
Write-Host "   Private: $($pkg.private)" -ForegroundColor White

# 4. Check semantic-release dependencies
Write-Host "`n4️⃣  Semantic Release Plugins" -ForegroundColor Yellow
$plugins = @(
    "semantic-release",
    "@semantic-release/changelog",
    "@semantic-release/commit-analyzer",
    "@semantic-release/exec",
    "@semantic-release/git",
    "@semantic-release/github",
    "@semantic-release/npm",
    "@semantic-release/release-notes-generator"
)

foreach ($plugin in $plugins) {
    $installed = $pkg.devDependencies.$plugin
    if ($installed) {
        Write-Host "   ✅ $plugin ($installed)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $plugin (NOT INSTALLED)" -ForegroundColor Red
    }
}

# 5. Check .releaserc.json
Write-Host "`n5️⃣  Release Configuration" -ForegroundColor Yellow
if (Test-Path ".releaserc.json") {
    Write-Host "   ✅ .releaserc.json exists" -ForegroundColor Green
    $releaserc = Get-Content ".releaserc.json" -Raw | ConvertFrom-Json
    Write-Host "   Configured branches:" -ForegroundColor White
    foreach ($branch in $releaserc.branches) {
        if ($branch -is [string]) {
            Write-Host "      - $branch" -ForegroundColor White
        } else {
            Write-Host "      - $($branch.name) (prerelease: $($branch.prerelease))" -ForegroundColor White
        }
    }
} else {
    Write-Host "   ❌ .releaserc.json NOT found" -ForegroundColor Red
}

# 6. Check build files
Write-Host "`n6️⃣  Build Artifacts" -ForegroundColor Yellow
$buildDirs = @("dist", "dist-electron", "release")
foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        $files = (Get-ChildItem $dir -Recurse -File).Count
        Write-Host "   ✅ $dir/ ($files files)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  $dir/ (missing)" -ForegroundColor Yellow
    }
}

# 7. Check GitHub Actions
Write-Host "`n7️⃣  GitHub Actions Workflows" -ForegroundColor Yellow
if (Test-Path ".github/workflows") {
    $workflows = Get-ChildItem ".github/workflows/*.yml"
    foreach ($wf in $workflows) {
        Write-Host "   ✅ $($wf.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "   ❌ .github/workflows/ NOT found" -ForegroundColor Red
}

# 8. Simulate a semantic-release dry run
Write-Host "`n8️⃣  Semantic Release Test" -ForegroundColor Yellow
Write-Host "   Analyzing commits..." -ForegroundColor White

# Check for commits that would trigger a release
$lastTag = git describe --tags --abbrev=0 2>$null
if ($lastTag) {
    Write-Host "   Last tag: $lastTag" -ForegroundColor White
    $commitsSinceTag = git log "$lastTag..HEAD" --oneline | Measure-Object -Line
    Write-Host "   Commits since last tag: $($commitsSinceTag.Lines)" -ForegroundColor White
} else {
    Write-Host "   ⚠️  No tags in the repository" -ForegroundColor Yellow
}

# 9. Check common problems
Write-Host "`n9️⃣  Common Problems" -ForegroundColor Yellow
$issues = @()

# Check whether package.json is in .gitignore
if (Select-String -Path ".gitignore" -Pattern "package.json" -Quiet) {
    $issues += "   ⚠️  package.json is in .gitignore (can cause problems)"
}

# Check that changelog.md exists
if (-not (Test-Path "changelog.md")) {
    $issues += "   ⚠️  changelog.md is missing (it will be created automatically)"
}

# Check that node_modules is installed
if (-not (Test-Path "node_modules")) {
    $issues += "   ❌ node_modules not installed - run: npm ci"
}

if ($issues.Count -eq 0) {
    Write-Host "   ✅ No problems detected" -ForegroundColor Green
} else {
    foreach ($issue in $issues) {
        Write-Host $issue -ForegroundColor Yellow
    }
}

# Final summary
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "📋 SUMMARY" -ForegroundColor Cyan
Write-Host "="*50 -ForegroundColor Cyan

Write-Host "`n💡 Recommended next steps:" -ForegroundColor Yellow
Write-Host "   1. Run: .\validate-commits.ps1 (check the commit format)" -ForegroundColor White
Write-Host "   2. Run: .\test-release.ps1 (test the release locally)" -ForegroundColor White
Write-Host "   3. If everything is OK, push to main or develop" -ForegroundColor White

Write-Host "`n📚 Useful documentation:" -ForegroundColor Yellow
Write-Host "   - Semantic Release: https://semantic-release.gitbook.io/" -ForegroundColor White
Write-Host "   - Conventional Commits: https://www.conventionalcommits.org/" -ForegroundColor White
