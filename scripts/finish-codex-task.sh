#!/usr/bin/env bash
set -euo pipefail

COMMIT_MESSAGE="${1:-}"

if [ -z "$COMMIT_MESSAGE" ]; then
  echo "Usage: ./scripts/finish-codex-task.sh \"<commit message>\""
  echo "Example: ./scripts/finish-codex-task.sh \"fix: update profile empty state copy\""
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)

if [ -z "$CURRENT_BRANCH" ]; then
  echo "Could not determine current branch."
  exit 1
fi

if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "Refusing to commit from main. Switch to a task branch first."
  exit 1
fi

echo "Current branch: $CURRENT_BRANCH"
echo "Current status:"
git status

echo "Diff stat:"
git diff --stat
git diff --cached --stat

printf "Commit and push these changes with message '%s'? [y/N] " "$COMMIT_MESSAGE"
read -r CONFIRM

case "$CONFIRM" in
  y|Y|yes|YES)
    ;;
  *)
    echo "Aborted."
    exit 1
    ;;
esac

git add -A
git commit -m "$COMMIT_MESSAGE"
git push -u origin "$CURRENT_BRANCH"

echo "Done. Current status:"
git status
