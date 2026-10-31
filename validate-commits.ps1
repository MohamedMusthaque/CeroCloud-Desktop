# Validates commits and detects problems

Write-Host "🔍 Commit Validation for Semantic Release" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Get the last 10 commits
$commits = git log --pretty=format:"%h|%s" -10

Write-Host "📝 Analyzing the last 10 commits...`n" -ForegroundColor Yellow

$validCommits = 0
$invalidCommits = 0

foreach ($commit in $commits) {
    $hash, $message = $commit -split '\|', 2
    
    # Valid patterns for semantic-release
    $patterns = @(
        '^feat(\(.+\))?:',      # New feature
        '^fix(\(.+\))?:',       # Bug fix
        '^docs(\(.+\))?:',      # Documentation
        '^style(\(.+\))?:',     # Formatting
        '^refactor(\(.+\))?:',  # Refactoring
        '^perf(\(.+\))?:',      # Performance improvement
        '^test(\(.+\))?:',      # Tests
        '^chore(\(.+\))?:',     # Maintenance tasks
        '^build(\(.+\))?:',     # Build system
        '^ci(\(.+\))?:',        # CI/CD
        '^revert(\(.+\))?:'     # Revert
    )
    
    $isValid = $false
    $type = "❓"
    
    foreach ($pattern in $patterns) {
        if ($message -match $pattern) {
            $isValid = $true
            if ($message -match '^feat') { $type = "✨" }
            elseif ($message -match '^fix') { $type = "🐛" }
            elseif ($message -match '^docs') { $type = "📝" }
            elseif ($message -match '^chore') { $type = "🔧" }
            else { $type = "✅" }
            break
        }
    }
    
    if ($isValid) {
        Write-Host "$type [$hash] $message" -ForegroundColor Green
        $validCommits++
    } else {
        Write-Host "❌ [$hash] $message" -ForegroundColor Red
        $invalidCommits++
    }
}

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✅ Valid commits: $validCommits" -ForegroundColor Green
Write-Host "   ❌ Invalid commits: $invalidCommits" -ForegroundColor Red

if ($invalidCommits -gt 0) {
    Write-Host "`n⚠️  IMPORTANT: invalid commits found!" -ForegroundColor Yellow
    Write-Host "`n💡 Correct commit format:" -ForegroundColor Cyan
    Write-Host "   feat: new feature (bumps the minor version)" -ForegroundColor White
    Write-Host "   fix: bug fix (bumps the patch version)" -ForegroundColor White
    Write-Host "   BREAKING CHANGE: incompatible change (bumps the major version)" -ForegroundColor White
    Write-Host "`nExamples:" -ForegroundColor Cyan
    Write-Host "   feat: add report export" -ForegroundColor White
    Write-Host "   fix: correct total calculation" -ForegroundColor White
    Write-Host "   fix(hotfix): fix auto-update in v1.1.1" -ForegroundColor White
    Write-Host "   chore: update dependencies" -ForegroundColor White
}

Write-Host "`n🔍 Current branch:" -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "   $branch" -ForegroundColor White

Write-Host "`n📌 Current version in package.json:" -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
Write-Host "   v$($packageJson.version)" -ForegroundColor White
