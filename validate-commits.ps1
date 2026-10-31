# Validates commits and detects problems

Write-Host "🔍 Validación de Commits para Semantic Release" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Get the last 10 commits
$commits = git log --pretty=format:"%h|%s" -10

Write-Host "📝 Analizando últimos 10 commits...`n" -ForegroundColor Yellow

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

Write-Host "`n📊 Resumen:" -ForegroundColor Cyan
Write-Host "   ✅ Commits válidos: $validCommits" -ForegroundColor Green
Write-Host "   ❌ Commits inválidos: $invalidCommits" -ForegroundColor Red

if ($invalidCommits -gt 0) {
    Write-Host "`n⚠️  IMPORTANTE: Commits inválidos detectados!" -ForegroundColor Yellow
    Write-Host "`n💡 Formato correcto de commits:" -ForegroundColor Cyan
    Write-Host "   feat: nueva funcionalidad (genera minor version)" -ForegroundColor White
    Write-Host "   fix: corrección de bug (genera patch version)" -ForegroundColor White
    Write-Host "   BREAKING CHANGE: cambio incompatible (genera major version)" -ForegroundColor White
    Write-Host "`nEjemplos:" -ForegroundColor Cyan
    Write-Host "   feat: agregar exportación de reportes" -ForegroundColor White
    Write-Host "   fix: corregir cálculo de totales" -ForegroundColor White
    Write-Host "   fix(hotfix): corregir auto-update en v1.1.1" -ForegroundColor White
    Write-Host "   chore: actualizar dependencias" -ForegroundColor White
}

Write-Host "`n🔍 Branch actual:" -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "   $branch" -ForegroundColor White

Write-Host "`n📌 Versión actual en package.json:" -ForegroundColor Yellow
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
Write-Host "   v$($packageJson.version)" -ForegroundColor White
