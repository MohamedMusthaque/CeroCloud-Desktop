# NexoraCloud - Pre-commit checks

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  NexoraCloud - Pre-Commit Check" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

$errors = 0

# Check TypeScript
Write-Host "[1/4] Verificando tipos TypeScript..." -ForegroundColor Yellow
try {
    $typecheck = npm run type-check --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Sin errores de TypeScript`n" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Errores de TypeScript encontrados`n" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  ⚠️  No se pudo ejecutar type-check`n" -ForegroundColor Yellow
}

# Check ESLint
Write-Host "[2/4] Ejecutando ESLint..." -ForegroundColor Yellow
try {
    $lint = npm run lint --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Sin errores de ESLint`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Advertencias de ESLint encontradas`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  No se pudo ejecutar ESLint`n" -ForegroundColor Yellow
}

# Check for large files
Write-Host "[3/4] Verificando archivos grandes..." -ForegroundColor Yellow
$largeFiles = Get-ChildItem -Recurse -File | Where-Object { 
    $_.Length -gt 1MB -and 
    $_.FullName -notmatch 'node_modules' -and 
    $_.FullName -notmatch '.git' 
}

if ($largeFiles) {
    Write-Host "  ⚠️  Archivos mayores a 1MB encontrados:" -ForegroundColor Yellow
    $largeFiles | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "     - $($_.Name) ($sizeMB MB)" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "  ✅ No hay archivos excesivamente grandes`n" -ForegroundColor Green
}

# Make sure no .env files or secrets are present
Write-Host "[4/4] Verificando archivos sensibles..." -ForegroundColor Yellow
$sensitiveFiles = Get-ChildItem -Recurse -File | Where-Object { 
    $_.Name -match '\.env' -or 
    $_.Name -match 'secret' -or 
    $_.Name -match 'password' 
} | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '.git'
}

if ($sensitiveFiles) {
    Write-Host "  ⚠️  Archivos potencialmente sensibles encontrados:" -ForegroundColor Yellow
    $sensitiveFiles | ForEach-Object {
        Write-Host "     - $($_.FullName)" -ForegroundColor Yellow
    }
    Write-Host ""
    $errors++
} else {
    Write-Host "  ✅ No se encontraron archivos sensibles`n" -ForegroundColor Green
}

# Summary
Write-Host "=================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "  ✅ Todo listo para commit!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  $errors error(es) encontrado(s)" -ForegroundColor Yellow
    Write-Host "  Revisa los problemas antes de hacer commit" -ForegroundColor Yellow
}
Write-Host "=================================`n" -ForegroundColor Cyan

# Show modified files
Write-Host "Archivos modificados en git:`n" -ForegroundColor Cyan
git status --short

Write-Host "`nTip: Usa 'git add .' para agregar todos los archivos" -ForegroundColor Gray
Write-Host "     Usa 'git commit -m `"mensaje`"' para hacer commit`n" -ForegroundColor Gray
