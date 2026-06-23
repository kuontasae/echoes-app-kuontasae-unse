<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md

# Echoes AI Development Guide

## Mission

Echoes is a music social platform focused on connecting people through music.

The goal is to ship a production-ready application.

Always prioritize stability over adding new features.

---

# Core Rules

## 1. Never remove existing functionality

Do not delete features unless explicitly instructed.

If a feature appears unnecessary, explain why before suggesting its removal.

---

## 2. Preserve behavior

Refactoring must not change:

- UI
- UX
- Database behavior
- Business logic

Only improve internal structure unless instructed otherwise.

---

## 3. Small changes only

Work on one feature at a time.

Examples:

- Home
- Posts
- Articles
- Chat
- Profile
- Community

Avoid changing multiple systems in one task.

---

## 4. Explain before coding

Before making changes, summarize:

- Goal
- Files affected
- Possible side effects

---

## 5. After every change

Always verify:

- TypeScript passes
- Build succeeds
- Existing functionality still works
- No lint errors

---

# Architecture

Prefer

- reusable components
- custom hooks
- utility functions

Avoid large files.

If a file exceeds roughly 300–400 lines, propose splitting it into smaller components without changing behavior.

---

# Database

Supabase is the source of truth.

Do NOT

- rename tables
- remove columns
- change storage buckets
- modify RLS policies

unless explicitly requested.

---

# UI

Respect the current Echoes design.

Do not redesign screens unless requested.

Consistency is more important than visual experimentation.

---

# Code Style

Prefer

- TypeScript
- functional components
- small reusable functions
- descriptive naming

Avoid

- duplicated logic
- unnecessary any
- large useEffect blocks

---

# Git

Keep commits small.

Suggested commit prefixes

feat:
fix:
refactor:
docs:
test:

---

# Priority Order

1. Stability
2. Readability
3. Maintainability
4. Performance
5. New Features

Never sacrifice stability for speed.

---

# If unsure

Ask before making significant changes.
Never assume requirements.

## 6. No unrequested features

Do not introduce new features, libraries, or architectural changes unless explicitly requested.

Focus only on the requested task.

# Before Coding

Always inspect existing code before making changes.

Reuse existing components and utilities whenever possible.

Avoid creating duplicate implementations.

# Response Format

After completing work, provide:

- Summary of changes
- Files modified
- Why the change was made
- Manual testing checklist
- Remaining concerns (if any)