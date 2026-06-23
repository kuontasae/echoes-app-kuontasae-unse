# Echoes Project Audit

## 1. Overview

Echoes is a music social platform built with Next.js, React, Supabase, Stripe, and Playwright.

The app is currently structured as a mostly single-page mobile-style experience. Users move between screens using a bottom navigation bar. Most product behavior is controlled from `app/page.tsx`, while some UI pieces have already been extracted into smaller component files under `app/components/`.

The main engineering priority should be stability. The app already contains many connected features, so future work should avoid broad rewrites and should change one area at a time.

## 2. Existing features

The repository currently includes these major feature areas:

- Authentication: login, signup, logout, session handling, and account deletion.
- Music feed: users can post song "vibes", like posts, comment on posts, delete posts, and browse global or following feeds.
- Music search: song and artist search, trending songs, artist/album views, and audio preview playback.
- Recommendations: daily recommended songs and diary-style song recommendations.
- Discover: user search, suggested users, similar music users, popular users, music tag filters, and live-history filters.
- Matching: swipe-style follow/pass matching.
- Communities: live/event communities, artist fan communities, join/leave flows, custom community creation, reporting, and admin restore/delete actions.
- Articles: article list tabs, article detail view, rich editor, drafts, uploads, paid content, likes, comments, share, edit, and delete.
- Coins and payments: coin charge plans, Stripe checkout, article purchases, and article gifts.
- Creator revenue: revenue dashboard, Stripe Connect onboarding/status, and payout request entry.
- Chat: one-to-one chats, group chats, community chats, realtime updates, read status, images, files, voice messages, music sharing, and message deletion.
- Profiles: profile editing, avatars, favorite artists, followers/following lists, liked posts, other-user profiles, follow/unfollow, block, unblock, and report.
- Notifications: notifications for social and content activity.
- Testing: Playwright E2E coverage in `tests/e2e/basic-ui.spec.ts`.

## 3. Main screens

The main user-facing screens are controlled by tab state inside `app/page.tsx`:

- Home / Feed: the main music feed, music search, today's recommendations, and post creation flow.
- Discover: people discovery, communities, and swipe matching.
- Read / Articles: article browsing, drafts, author navigation, paid article access, and article actions.
- Diary: calendar/timeline view of recorded songs and AI-style recommendations.
- Chat: chat lists, active chat rooms, chat details, file/image/voice/music message flows.
- Profile: current user profile, other-user profile, favorite artists, liked posts, followers/following, and settings entry points.

There are also many modal-style screens layered on top of those tabs, such as article editor, publish settings, coin charge, community creation, notifications, settings, onboarding, revenue dashboard, and admin dashboard.

## 4. Largest / highest-risk file

The largest and highest-risk file is:

- `app/page.tsx`: about 6,991 lines.

This file is high risk because it controls many unrelated parts of the product at once. A small change in this file can accidentally affect authentication, feed behavior, articles, chat, payments, profile state, communities, or modals.

The file is not only rendering UI. It also handles state, Supabase queries, Supabase mutations, uploads, realtime subscriptions, external API calls, Stripe checkout entry points, local storage, content editing, and navigation.

## 5. Responsibilities currently inside app/page.tsx

`app/page.tsx` currently has these responsibilities:

- App shell and bottom navigation.
- Active tab state and screen switching.
- Login, signup, logout, session initialization, and account deletion.
- Local translation strings and toast messages.
- User settings such as language, timezone, notifications, and audio preview.
- Profile loading, editing, onboarding, following, followers, blocking, unblocking, and reporting.
- Feed loading, filtering, infinite scroll, post creation, likes, comments, and deletion.
- Music search, artist search, album search, artist pages, favorite artists, and audio playback.
- Recommended songs and diary recommendations.
- Discover users, user filtering, shared music matching, and swipe matching.
- Community loading, artist communities, live communities, create/join/leave/report/admin actions.
- Article list state, article editor state, draft handling, uploads, publishing, likes, comments, editing, deleting, purchasing, and gifting.
- Coin charge modal state and Stripe checkout startup.
- Revenue dashboard, Stripe Connect onboarding/status, and payout request startup.
- Chat list loading, active chat room state, realtime chat updates, sending messages, image/file/voice/music sharing, read state, and message deletion.
- Notifications loading and read-state updates.
- Modal visibility and body scroll locking.
- Calendar and diary rendering helpers.

Some UI responsibilities have already been separated into component files, but most state and business logic still lives in `app/page.tsx`.

## 6. Highest-risk files

These files should be treated carefully:

- `app/page.tsx`: largest file and main controller for most product behavior.
- `app/api/create-checkout-session/webhook/route.ts`: Stripe webhook handling, coin balances, transactions, and payout event sync.
- `app/api/send-article-gift/route.ts`: article gifts, coin balance changes, creator revenue, transactions, and notifications.
- `app/api/payouts/request/route.ts`: payout calculations and Stripe transfer creation.
- `app/api/stripe-connect/onboarding/route.ts`: Stripe connected account creation and onboarding links.
- `app/api/stripe-connect/status/route.ts`: Stripe account status and payout readiness.
- `app/api/article-detail/route.ts`: paid article access and premium content visibility.
- `app/supabase.ts`: shared Supabase client used across the app.
- `app/types.ts`: shared TypeScript interfaces used by feed, chat, profile, and communities.
- `supabase/migrations/*.sql`: database tables, policies, and schema behavior.

Payment, payout, premium content, auth, and database policy areas are especially sensitive because mistakes can affect money, privacy, or access control.

## 7. Technical debt

The main technical debt is concentration of responsibility.

`app/page.tsx` is much larger than the rest of the app and contains many feature areas in one place. This makes the file harder to read, harder to test, and riskier to change.

Other notable debt:

- Many unrelated state variables live in one component.
- Many Supabase reads and writes are mixed directly with UI logic.
- Several modals are controlled from the same parent file.
- Some helper functions use broad `any` types.
- Some business logic, rendering logic, and navigation logic are interleaved.
- Article, chat, community, profile, and payment flows are tightly connected through shared state.
- The file is above the project's preferred 300-400 line guideline by a large margin.

This does not mean the app is broken. It means future changes should be small, careful, and verified.

## 8. Recommended improvement order

Recommended order for future improvements:

1. Stabilize documentation and testing expectations.
   - Keep a clear list of core flows to verify after changes.
   - Use this audit as a map before touching large files.

2. Improve one feature area at a time.
   - Do not split multiple systems in one change.
   - Start with an area that already has extracted components, such as Articles, Chat, or Profile.

3. Move UI-only pieces before moving business logic.
   - UI-only extraction is usually easier to verify.
   - Business logic should move later and only with strong tests or careful manual checks.

4. Prefer small helpers and components.
   - Keep behavior the same.
   - Avoid redesigning screens during structural cleanup.

5. Be extra cautious around payments, payouts, premium content, and Supabase policies.
   - These areas should only change when there is a specific task and a clear test plan.

6. Add or update tests when changing major flows.
   - Login state, feed posting, article purchase, chat, and profile actions are especially important.

## 9. Manual testing checklist

Use this checklist after future code changes. Not every task needs every item, but changes touching shared files should cover the relevant flows.

- Run `npm run lint`.
- Run `npm run build` for UI, API, or type changes.
- Run `npm run test:e2e` when a main user flow changes.
- Verify login, signup, logout, and session restore.
- Verify the Home feed loads.
- Verify song search works.
- Verify posting a song vibe works.
- Verify liking and commenting on a vibe works.
- Verify following and unfollowing a user works.
- Verify profile editing works.
- Verify Discover user filters work.
- Verify community join and leave works.
- Verify article list loads.
- Verify article draft save/open/delete works.
- Verify article publish works.
- Verify paid article purchase behavior if article monetization changed.
- Verify article gift behavior if coin or transaction logic changed.
- Verify chat list loads.
- Verify sending a text chat message works.
- Verify chat image/file/voice/music flows if chat upload logic changed.
- Verify notifications open and read-state behavior works.
- Verify coin charge flow if payment entry logic changed.
- Verify Stripe Connect and payout flows only in the appropriate test environment.
- Verify blocked users/reporting flows if safety features changed.
- Verify the app still feels consistent with the existing Echoes UI.
