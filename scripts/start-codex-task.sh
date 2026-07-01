#!/usr/bin/env bash
set -euo pipefail

BRANCH="${1:-}"

if [ -z "$BRANCH" ]; then
  echo "Usage:"
  echo "  ./scripts/start-codex-task.sh fix/example-task"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: This is not a git repository."
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working tree is not clean."
  echo
  git status --short
  echo
  echo "Commit, merge, or discard current changes before starting a new Codex task."
  exit 1
fi

echo "Switching to main..."
git switch main

echo "Pulling latest main..."
git pull --ff-only

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "Error: Local branch already exists: $BRANCH"
  echo "Use a new branch name to avoid mixing tasks."
  exit 1
fi

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
  echo "Error: Remote branch already exists: $BRANCH"
  echo "Use a new branch name to avoid mixing tasks."
  exit 1
fi

echo "Creating task branch: $BRANCH"
git switch -c "$BRANCH"

echo
echo "Ready for Codex."
echo
echo "Next:"
echo "1. Paste the Codex prompt into Codex."
echo "2. If Codex succeeds, run:"
echo
echo "   ./scripts/finish-current-codex-task.sh"
echo
echo "Current branch:"
git branch --show-current
