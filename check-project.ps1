# NexoraCloud - Pre-commit checks

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "  NexoraCloud - Pre-Commit Check" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

$errors = 0

# Check TypeScript
Write-Host "[1/4] Checking TypeScript types..." -ForegroundColor Yellow
try {
    $typecheck = npm run type-check --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ No TypeScript errors`n" -ForegroundColor Green
    } else {
        Write-Host "  ❌ TypeScript errors found`n" -ForegroundColor Red
        $errors++
    }
} catch {
    Write-Host "  ⚠️  Could not run type-check`n" -ForegroundColor Yellow
}

# Check ESLint
Write-Host "[2/4] Running ESLint..." -ForegroundColor Yellow
try {
    $lint = npm run lint --silent 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ No ESLint errors`n" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  ESLint warnings found`n" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠️  Could not run ESLint`n" -ForegroundColor Yellow
}

# Check for large files
Write-Host "[3/4] Checking for large files..." -ForegroundColor Yellow
$largeFiles = Get-ChildItem -Recurse -File | Where-Object { 
    $_.Length -gt 1MB -and 
    $_.FullName -notmatch 'node_modules' -and 
    $_.FullName -notmatch '.git' 
}

if ($largeFiles) {
    Write-Host "  ⚠️  Files larger than 1MB found:" -ForegroundColor Yellow
    $largeFiles | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 2)
        Write-Host "     - $($_.Name) ($sizeMB MB)" -ForegroundColor Yellow
    }
    Write-Host ""
} else {
    Write-Host "  ✅ No overly large files`n" -ForegroundColor Green
}

# Make sure no .env files or secrets are present
Write-Host "[4/4] Checking for sensitive files..." -ForegroundColor Yellow
$sensitiveFiles = Get-ChildItem -Recurse -File | Where-Object { 
    $_.Name -match '\.env' -or 
    $_.Name -match 'secret' -or 
    $_.Name -match 'password' 
} | Where-Object {
    $_.FullName -notmatch 'node_modules' -and
    $_.FullName -notmatch '.git'
}

if ($sensitiveFiles) {
    Write-Host "  ⚠️  Potentially sensitive files found:" -ForegroundColor Yellow
    $sensitiveFiles | ForEach-Object {
        Write-Host "     - $($_.FullName)" -ForegroundColor Yellow
    }
    Write-Host ""
    $errors++
} else {
    Write-Host "  ✅ No sensitive files found`n" -ForegroundColor Green
}

# Summary
Write-Host "=================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "  ✅ Ready to commit!" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  $errors error(s) found" -ForegroundColor Yellow
    Write-Host "  Review the problems before committing" -ForegroundColor Yellow
}
Write-Host "=================================`n" -ForegroundColor Cyan

# Show modified files
Write-Host "Files modified in git:`n" -ForegroundColor Cyan
git status --short

Write-Host "`nTip: use 'git add .' to stage every file" -ForegroundColor Gray
Write-Host "     use 'git commit -m `"message`"' to commit`n" -ForegroundColor Gray
