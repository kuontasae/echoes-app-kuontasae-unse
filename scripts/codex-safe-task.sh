#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:-}"
TASK_INSTRUCTION="${2:-}"

if [ -z "$BRANCH_NAME" ] || [ -z "$TASK_INSTRUCTION" ]; then
  echo "Usage: ./scripts/codex-safe-task.sh <branch-name> \"<task instruction>\""
  echo "Example: ./scripts/codex-safe-task.sh fix/profile-copy \"Update the profile empty-state copy only.\""
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "codex command not found"
  exit 1
fi

echo "Checking git working tree..."
if [ -n "$(git status --porcelain)" ]; then
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

SAFETY_PROMPT=$(cat <<'PROMPT'
You are working in the Echoes app repository.

Before coding, inspect the relevant existing code and explain:
- Goal
- Files affected
- Possible side effects

Safety rules:
- Keep changes small and focused on the requested task.
- Touch only the files necessary for the task.
- Do not change schema, migrations, RLS policies, API behavior, payments, or auth logic unless explicitly requested.
- Preserve existing UI layout and UX unless a UI change is explicitly requested.
- Reuse existing components, hooks, utilities, and code patterns.
- Do not introduce unrequested features, libraries, or broad architectural changes.
- When localization is relevant, use the existing i18n patterns for 日本語, English, and 中文.
- Preserve existing behavior and do not remove functionality unless explicitly requested.

After completing the task, report:
- Summary of changes
- Files modified
- Build result
- Manual testing checklist
- Remaining concerns, if any
PROMPT
)

echo "Running Codex task..."
codex exec "$SAFETY_PROMPT

Task instruction:
$TASK_INSTRUCTION"

echo "Running build..."
npm run build

echo "Done. Current status:"
git status

echo "Changed files:"
git diff --stat
