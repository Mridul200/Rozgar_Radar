#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Terminal colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory of the script
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

# Get current branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")"

# Check if an argument was passed for the commit message
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    # Default commit message with current timestamp
    COMMIT_MSG="chore: update $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo -e "${BLUE}==> Checking repository status...${NC}"

# Check for uncommitted changes
HAS_CHANGES=false
if [ -n "$(git status --porcelain)" ]; then
    HAS_CHANGES=true
fi

# Check for unpushed commits
HAS_UNPUSHED=false
if [ -n "$(git log origin/${CURRENT_BRANCH}..HEAD 2>/dev/null)" ]; then
    HAS_UNPUSHED=true
fi

if [ "$HAS_CHANGES" = false ] && [ "$HAS_UNPUSHED" = false ]; then
    echo -e "${YELLOW}No changes or unpushed commits found. Working tree is clean.${NC}"
    exit 0
fi

if [ "$HAS_CHANGES" = true ]; then
    echo -e "${BLUE}==> Staging changes...${NC}"
    git add -A

    echo -e "${BLUE}==> Committing changes with message:${NC} \"${COMMIT_MSG}\""
    git commit -m "$COMMIT_MSG"
fi

echo -e "${BLUE}==> Pushing to origin/${CURRENT_BRANCH}...${NC}"
if git push origin "$CURRENT_BRANCH"; then
    echo -e "${GREEN}✔ Successfully pushed all changes to origin/${CURRENT_BRANCH}!${NC}"
else
    echo -e "${RED}✖ Push failed.${NC}"
    echo -e "${YELLOW}Tip: Ensure your SSH key is added to GitHub at https://github.com/settings/keys and you have write permissions to the repository.${NC}"
    exit 1
fi
