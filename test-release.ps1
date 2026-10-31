# Tests semantic-release locally
# Simulates the release process without publishing anything

Write-Host "🔍 Prueba Local de Semantic Release" -ForegroundColor Cyan
Write-Host "====================================`n" -ForegroundColor Cyan

# 1. Make sure we are in the right directory
Write-Host "📁 Directorio actual: $PWD" -ForegroundColor Yellow

# 2. Check the current branch
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "🌿 Branch actual: $branch" -ForegroundColor Yellow

if ($branch -ne "main" -and $branch -ne "develop") {
    Write-Host "⚠️  ADVERTENCIA: No estás en 'main' o 'develop'" -ForegroundColor Red
    Write-Host "   Semantic release solo funciona en estas branches`n" -ForegroundColor Red
}

# 3. Check the latest commits
Write-Host "`n📝 Últimos 5 commits:" -ForegroundColor Yellow
git log --oneline -5

# 4. Check dependencies
Write-Host "`n📦 Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ node_modules no encontrado. Ejecuta: npm ci" -ForegroundColor Red
    exit 1
}

# 5. Run semantic-release in dry-run mode
Write-Host "`n🧪 Ejecutando semantic-release en modo DRY-RUN..." -ForegroundColor Green
Write-Host "   (Esto NO creará releases reales)`n" -ForegroundColor Green

$env:GITHUB_TOKEN = "fake-token-for-testing"
npx semantic-release --dry-run --no-ci

Write-Host "`n✅ Prueba completada!" -ForegroundColor Green
Write-Host "`n💡 Notas:" -ForegroundColor Cyan
Write-Host "   - Si ves errores de autenticación, es normal en modo local" -ForegroundColor White
Write-Host "   - Revisa si detecta la versión correcta y los commits" -ForegroundColor White
Write-Host "   - Los errores de plugins son los que debemos corregir" -ForegroundColor White
