# Gitflow helper script for NexoraCloud
# Helps create and manage branches following Gitflow

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet('feature', 'release', 'hotfix', 'finish')]
    [string]$Action,
    
    [Parameter(Mandatory=$false)]
    [string]$Name
)

function Start-Feature {
    param([string]$FeatureName)
    
    if ([string]::IsNullOrEmpty($FeatureName)) {
        Write-Host "❌ Error: you must give the feature name" -ForegroundColor Red
        Write-Host "Example: .\gitflow-helper.ps1 feature my-new-feature" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "🚀 Creating feature branch: feature/$FeatureName" -ForegroundColor Cyan
    
    git checkout develop
    git pull origin develop
    git checkout -b "feature/$FeatureName"
    
    Write-Host "✅ Feature branch created!" -ForegroundColor Green
    Write-Host "📝 Work on your feature and commit using Conventional Commits:" -ForegroundColor Yellow
    Write-Host "   git commit -m 'feat: describe the feature'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "🔄 When you're done, push and open a PR to develop:" -ForegroundColor Yellow
    Write-Host "   git push origin feature/$FeatureName" -ForegroundColor Gray
}

function Start-Release {
    param([string]$Version)
    
    if ([string]::IsNullOrEmpty($Version)) {
        Write-Host "❌ Error: you must give the release version" -ForegroundColor Red
        Write-Host "Example: .\gitflow-helper.ps1 release v1.1.0" -ForegroundColor Yellow
        exit 1
    }
    
    # Strip a leading 'v' if present
    $CleanVersion = $Version -replace '^v', ''
    
    Write-Host "📦 Creating release branch: release/v$CleanVersion" -ForegroundColor Cyan
    
    git checkout develop
    git pull origin develop
    git checkout -b "release/v$CleanVersion"
    
    Write-Host "⬆️  Updating the version in package.json..." -ForegroundColor Yellow
    npm version $CleanVersion --no-git-tag-version
    
    git add package.json package-lock.json
    git commit -m "chore: bump version to $CleanVersion"
    
    Write-Host "✅ Release branch created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Update changelog.md with the changes" -ForegroundColor Gray
    Write-Host "   2. Make any final adjustments" -ForegroundColor Gray
    Write-Host "   3. Run: .\gitflow-helper.ps1 finish v$CleanVersion" -ForegroundColor Gray
}

function Start-Hotfix {
    param([string]$HotfixName)
    
    if ([string]::IsNullOrEmpty($HotfixName)) {
        Write-Host "❌ Error: you must give the hotfix name" -ForegroundColor Red
        Write-Host "Example: .\gitflow-helper.ps1 hotfix fix-critical-bug" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "🚨 Creating hotfix branch: hotfix/$HotfixName" -ForegroundColor Red
    
    git checkout main
    git pull origin main
    git checkout -b "hotfix/$HotfixName"
    
    Write-Host "✅ Hotfix branch created!" -ForegroundColor Green
    Write-Host "🔧 Fix the bug and commit:" -ForegroundColor Yellow
    Write-Host "   git commit -m 'fix: describe the fixed bug'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📌 Remember to bump the patch version:" -ForegroundColor Yellow
    Write-Host "   npm version patch --no-git-tag-version" -ForegroundColor Gray
}

function Finish-Branch {
    param([string]$BranchName)
    
    $CurrentBranch = git rev-parse --abbrev-ref HEAD
    
    if ($CurrentBranch -notmatch '^(release|hotfix)/') {
        Write-Host "❌ Error: only release/* or hotfix/* branches can be finished" -ForegroundColor Red
        Write-Host "Your current branch: $CurrentBranch" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "🏁 Finishing branch: $CurrentBranch" -ForegroundColor Cyan
    
    # Merge a main
    Write-Host "📤 Merging into main..." -ForegroundColor Yellow
    git checkout main
    git pull origin main
    git merge --no-ff $CurrentBranch
    git push origin main
    
    # Merge a develop
    Write-Host "📤 Merging into develop..." -ForegroundColor Yellow
    git checkout develop
    git pull origin develop
    git merge --no-ff $CurrentBranch
    git push origin develop
    
    # Delete the local and remote branch
    Write-Host "🗑️  Deleting branch $CurrentBranch..." -ForegroundColor Yellow
    git branch -d $CurrentBranch
    git push origin --delete $CurrentBranch
    
    Write-Host "✅ Branch finished and merged!" -ForegroundColor Green
    Write-Host "🚀 GitHub Actions will create the release automatically" -ForegroundColor Cyan
}

# Run the requested action
switch ($Action) {
    'feature' { Start-Feature -FeatureName $Name }
    'release' { Start-Release -Version $Name }
    'hotfix'  { Start-Hotfix -HotfixName $Name }
    'finish'  { Finish-Branch -BranchName $Name }
}
