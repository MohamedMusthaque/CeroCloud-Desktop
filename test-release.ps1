# Tests semantic-release locally
# Simulates the release process without publishing anything

Write-Host "🔍 Local Semantic Release Test" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# 1. Make sure we are in the right directory
Write-Host "📁 Current directory: $PWD" -ForegroundColor Yellow

# 2. Check the current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "🌿 Current branch: $branch" -ForegroundColor Yellow

if ($branch -ne "main" -and $branch -ne "develop") {
    Write-Host "⚠️  WARNING: you are not on 'main' or 'develop'" -ForegroundColor Red
    Write-Host "   Semantic release only works on these branches`n" -ForegroundColor Red
}

# 3. Check the latest commits
Write-Host "`n📝 Last 5 commits:" -ForegroundColor Yellow
git log --oneline -5

# 4. Check dependencies
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules not found. Run: npm ci" -ForegroundColor Red
    exit 1
}

# 5. Run semantic-release in dry-run mode
Write-Host "`n🧪 Running semantic-release in DRY-RUN mode..." -ForegroundColor Green
Write-Host "   (This will NOT create real releases)`n" -ForegroundColor Green

$env:GITHUB_TOKEN = "fake-token-for-testing"
npx semantic-release --dry-run --no-ci

Write-Host "`n✅ Test completed!" -ForegroundColor Green
Write-Host "`n💡 Notes:" -ForegroundColor Cyan
Write-Host "   - Authentication errors are normal when running locally" -ForegroundColor White
Write-Host "   - Check that it detects the right version and commits" -ForegroundColor White
Write-Host "   - Plugin errors are the ones to fix" -ForegroundColor White
