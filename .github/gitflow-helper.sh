#!/bin/bash
# Gitflow helper script for NexoraCloud (Linux/Mac)
# Helps create and manage branches following Gitflow

set -e

ACTION=$1
NAME=$2

function start_feature() {
    local feature_name=$1
    
    if [ -z "$feature_name" ]; then
        echo "❌ Error: you must give the feature name"
        echo "Example: ./gitflow-helper.sh feature my-new-feature"
        exit 1
    fi
    
    echo "🚀 Creating feature branch: feature/$feature_name"
    
    git checkout develop
    git pull origin develop
    git checkout -b "feature/$feature_name"
    
    echo "✅ Feature branch created!"
    echo "📝 Work on your feature and commit using Conventional Commits:"
    echo "   git commit -m 'feat: describe the feature'"
    echo ""
    echo "🔄 When you're done, push and open a PR to develop:"
    echo "   git push origin feature/$feature_name"
}

function start_release() {
    local version=$1
    
    if [ -z "$version" ]; then
        echo "❌ Error: you must give the release version"
        echo "Example: ./gitflow-helper.sh release v1.1.0"
        exit 1
    fi
    
    # Strip a leading 'v' if present
    version=${version#v}
    
    echo "📦 Creating release branch: release/v$version"
    
    git checkout develop
    git pull origin develop
    git checkout -b "release/v$version"
    
    echo "⬆️  Updating the version in package.json..."
    npm version $version --no-git-tag-version
    
    git add package.json package-lock.json
    git commit -m "chore: bump version to $version"
    
    echo "✅ Release branch created!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Update changelog.md with the changes"
    echo "   2. Make any final adjustments"
    echo "   3. Run: ./gitflow-helper.sh finish v$version"
}

function start_hotfix() {
    local hotfix_name=$1
    
    if [ -z "$hotfix_name" ]; then
        echo "❌ Error: you must give the hotfix name"
        echo "Example: ./gitflow-helper.sh hotfix fix-critical-bug"
        exit 1
    fi
    
    echo "🚨 Creating hotfix branch: hotfix/$hotfix_name"
    
    git checkout main
    git pull origin main
    git checkout -b "hotfix/$hotfix_name"
    
    echo "✅ Hotfix branch created!"
    echo "🔧 Fix the bug and commit:"
    echo "   git commit -m 'fix: describe the fixed bug'"
    echo ""
    echo "📌 Remember to bump the patch version:"
    echo "   npm version patch --no-git-tag-version"
}

function finish_branch() {
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    
    if [[ ! $current_branch =~ ^(release|hotfix)/ ]]; then
        echo "❌ Error: only release/* or hotfix/* branches can be finished"
        echo "Your current branch: $current_branch"
        exit 1
    fi
    
    echo "🏁 Finishing branch: $current_branch"
    
    # Merge a main
    echo "📤 Merging into main..."
    git checkout main
    git pull origin main
    git merge --no-ff $current_branch
    git push origin main
    
    # Merge a develop
    echo "📤 Merging into develop..."
    git checkout develop
    git pull origin develop
    git merge --no-ff $current_branch
    git push origin develop
    
    # Delete the local and remote branch
    echo "🗑️  Deleting branch $current_branch..."
    git branch -d $current_branch
    git push origin --delete $current_branch
    
    echo "✅ Branch finished and merged!"
    echo "🚀 GitHub Actions will create the release automatically"
}

# Run the requested action
case $ACTION in
    feature)
        start_feature $NAME
        ;;
    release)
        start_release $NAME
        ;;
    hotfix)
        start_hotfix $NAME
        ;;
    finish)
        finish_branch
        ;;
    *)
        echo "❌ Invalid action: $ACTION"
        echo "Uso: ./gitflow-helper.sh {feature|release|hotfix|finish} [name]"
        exit 1
        ;;
esac
