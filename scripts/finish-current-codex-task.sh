#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: This is not a git repository."
  exit 1
fi

BRANCH="$(git branch --show-current)"

if [ -z "$BRANCH" ]; then
  echo "Error: Could not detect current branch."
  exit 1
fi

if [ "$BRANCH" = "main" ]; then
  echo "Error: Refusing to commit from main."
  echo "Start a task branch first with:"
  echo "  ./scripts/start-codex-task.sh fix/example-task"
  exit 1
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit."
  echo "Current branch: $BRANCH"
  exit 0
fi

PREFIX="${BRANCH%%/*}"
NAME="${BRANCH#*/}"

if [ "$NAME" = "$BRANCH" ]; then
  PREFIX="chore"
  NAME="$BRANCH"
fi

case "$PREFIX" in
  fix|feat|chore|docs|refactor|test|perf|style)
    TYPE="$PREFIX"
    ;;
  *)
    TYPE="chore"
    NAME="$BRANCH"
    ;;
esac

SUMMARY="$(echo "$NAME" | sed -E 's/[-_]+/ /g')"
MESSAGE="$TYPE: $SUMMARY"

echo "Current branch: $BRANCH"
echo "Auto commit message: $MESSAGE"
echo
echo "Current changes:"
git status --short
echo
echo "Diff stat:"
git diff --stat
echo

echo "Running TypeScript check..."
npx tsc --noEmit

echo
echo "Running production build..."
npm run build

echo
echo "Committing and pushing task branch..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes after git add."
  exit 0
fi

git commit -m "$MESSAGE"
git push -u origin "$BRANCH"

echo
echo "Merging task branch into main..."
git switch main
git pull --ff-only
git merge --no-edit "$BRANCH"

echo
echo "Pushing main..."
git push origin main

echo
echo "Done."
echo "Task branch pushed and merged into main: $BRANCH"
echo
echo "Current status:"
git status
echo
echo "Next message to ChatGPT:"
echo "done $BRANCH"
