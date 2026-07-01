#!/usr/bin/env bash
set -euo pipefail

TASK_BRANCH=$(git branch --show-current)

if [ -z "$TASK_BRANCH" ]; then
  echo "Could not determine current branch."
  exit 1
fi

if [ "$TASK_BRANCH" = "main" ]; then
  echo "Refusing to merge from main. Switch to a task branch first."
  exit 1
fi

echo "Checking git working tree..."
if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is not clean. Commit, stash, or discard changes first."
  git status
  exit 1
fi

echo "Remembered task branch: $TASK_BRANCH"
echo "Switching to main and pulling latest..."
git checkout main
git pull --ff-only

echo "Merging task branch: $TASK_BRANCH"
git merge --no-edit "$TASK_BRANCH"

echo "Pushing main..."
git push

echo "Done. Current status:"
git status
