#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:-}"
PROMPT_FILE="${2:-}"

if [ -z "$BRANCH_NAME" ] || [ -z "$PROMPT_FILE" ]; then
  echo "Usage: ./scripts/run-codex-task.sh <branch-name> <prompt-file>"
  echo "Example: ./scripts/run-codex-task.sh fix/localized-reset-password prompts/localized-reset-password.md"
  exit 1
fi

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Prompt file not found: $PROMPT_FILE"
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex command not found"
  exit 1
fi

echo "Checking git working tree..."
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Commit, stash, or discard changes first."
  git status
  exit 1
fi

echo "Switching to main and pulling latest..."
git checkout main
git pull --ff-only

echo "Creating or switching to branch: $BRANCH_NAME"
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME"; then
  git checkout "$BRANCH_NAME"
else
  git checkout -b "$BRANCH_NAME"
fi

echo "Running Codex task from: $PROMPT_FILE"
codex exec "$(cat "$PROMPT_FILE")"

echo "Running build..."
npm run build

echo "Done. Current status:"
git status

echo "Changed files:"
git diff --stat
