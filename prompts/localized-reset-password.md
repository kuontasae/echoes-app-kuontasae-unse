Read AGENTS.md and docs/PROJECT_AUDIT.md first.

We are on branch fix/localized-reset-password.

Goal:
Localize the standalone reset password page.

Scope:
- app/reset-password/page.tsx only

Requirements:
1. Add a small local i18n dictionary inside app/reset-password/page.tsx for:
   - 日本語
   - English
   - 中文

2. Read the saved app language from localStorage using the existing key:
   - echoes_language

3. If the saved language is missing or invalid, default to 日本語.

4. Replace all hardcoded Japanese user-facing text in this page:
   - title
   - helper text
   - placeholders
   - buttons
   - success messages
   - error messages
   - loading/status messages

5. Do not change Supabase auth logic.
6. Do not change password validation rules.
7. Do not change UI layout/design.
8. Do not touch app/page.tsx.
9. Do not touch API routes, Supabase schema, migrations, or other components.
10. Run npm run build.

After changes, report:
- Summary
- Files modified
- Languages supported
- Build result
- Manual testing checklist
