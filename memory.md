# QuickHands Client-App Memory

Last Updated: 2026-06-27

## Product

QuickHands client-app — the client/job-poster side of a service marketplace. Clients post jobs, review applications from freelancers, hire, coordinate via in-app messaging, and leave reviews. No local database; thin client over an external API at `quickhands-api.onrender.com`.

## Screens Touched This Session

No new screens — this session was a codebase audit + bug-fix pass:

```text
context/architecture/SKILL.md   — new: documents real architecture
context/imprint/SKILL.md        — new: documents real (fragmented) design system
context/recover/SKILL.md        — new: stack-specific failure modes
context/remember/SKILL.md       — new: this save/restore format
context/review/SKILL.md         — new: review checklist tied to this codebase

app/_layout.tsx                 — registered DM Sans + DM Serif Display fonts; fixed 3 broken fontFamily strings
app/(root)/_layout.tsx          — fixed 2 broken fontFamily strings (tab badge + tab label)
app/(root)/home.tsx             — fixed ~30 DMSans-*/DMSerifDisplay-* fontFamily strings to match loaded keys
components/SplashScreen.tsx     — fixed 5 DMSans-*/DMSerifDisplay-* fontFamily strings; removed stale "// Register this in your app" comment
app/(auth)/onboarding.tsx       — fixed 5 Jakarta/-Bold/-SemiBold fontFamily strings to PlusJakartaSans_* keys
app/(root)/service.tsx          — getToken() -> waitForClerkToken(getToken), 2 call sites
app/(root)/profile.tsx          — getToken() -> waitForClerkToken(getToken), 1 call site
app/(root)/applications.tsx     — getToken() -> waitForClerkToken(getToken), 5 call sites
package.json                    — added @expo-google-fonts/dm-sans, @expo-google-fonts/dm-serif-display
```

## Architecture Decisions

Expo Router (file-based) for navigation. Clerk for auth; `waitForClerkToken()` (lib/session.ts) is required for every authenticated call — calling `getToken()` directly is the known cause of intermittent 401s right after launch/sign-in. No global state library — local `useState` + polling (10–15s) + two socket.io contexts (notifications in `SocketContext`, messaging in `useMessagingSocket`/`useMessagingConversations`). All API access should go through `lib/fetch.ts` `getApiUrl()`/`fetchAPI()`, default host `https://quickhands-api.onrender.com`. Sockets are deliberately disabled on `*.vercel.app` hosts (`isUnsupportedSocketHost()`) — polling fallback is expected there, not a bug.

## Design System State

Font: Plus Jakarta Sans, DM Sans (300/400/500/600), and DM Serif Display (Regular + Italic) are now all actually loaded via `useFonts` in `app/_layout.tsx`. Every `fontFamily` string in the codebase now matches a loaded key — confirmed via full-repo grep, zero broken references remain in app code.

Primary green: **still NOT consolidated** (left as-is this session, per explicit decision). Tailwind config declares `#10B981` but screens in practice use `#15803d`, `#16a34a`, `#1A7F5A`, `#0A1F16`, `#0f1f14` as "the brand green." This is open — see Open Questions.

Styling: NativeWind `className` in newer screens (service.tsx, profile.tsx, applications.tsx, onboarding.tsx, signin.tsx), inline `style` in older ones (home.tsx, notifications.tsx, chat.tsx, tab bar) — match the file, don't mix.

## Problems Solved

- Splash screen and home.tsx were rendering in the system default font instead of the intended DM Sans / DM Serif Display — those font packages were never installed or loaded, despite a developer comment (`// Register this in your app`) acknowledging it. Fixed by installing `@expo-google-fonts/dm-sans` + `@expo-google-fonts/dm-serif-display` and loading all required weights.
- Found a second, separate font bug: several files used hyphenated font keys (`PlusJakartaSans-Bold`, `Jakarta-Bold`, `Jakarta-SemiBold`, `Jakarta`) that don't match the actual loaded keys (`PlusJakartaSans_700Bold`, etc.) — these silently fell back to system font too. Fixed in `app/_layout.tsx`, `app/(root)/_layout.tsx` (including one ternary-style reference a simple regex grep missed), and `app/(auth)/onboarding.tsx`.
- Confirmed `fixed-clerk-middleware.js` at repo root has zero references anywhere in `app/`/`lib/` — it's dead code, not wired into routing.
- Confirmed 8 call sites (`service.tsx` x2, `profile.tsx` x1, `applications.tsx` x5) called `getToken()` directly instead of `waitForClerkToken()` — the exact shape of the documented intermittent-401 failure mode. All fixed.
- `npx tsc --noEmit` passes clean after all changes.

## Current State

Font system: fully consistent and working (verified via grep + typecheck). Auth token resolution: fully consistent (`waitForClerkToken` used everywhere an authenticated call is made). Color system: still fragmented — known, documented, intentionally deferred. `app/(root)/applications.tsx.old` and `dist/` build output are still dead weight in the tree (not touched this session). `.env` defines `API_URL`/`DATABASE_URL` (unprefixed) while the app reads `EXPO_PUBLIC_API_URL` — still a latent mismatch, not addressed this session.

## Next Session Starts With

Decide and consolidate the primary brand green (candidates: `#10B981` from Tailwind config vs. the in-practice `#15803d`/`#16a34a`/`#1A7F5A` family), then run `/quickhands-imprint audit` to apply it consistently across screens.

## Open Questions

- Which green is canon: the configured `#10B981`, or one of the in-practice greens?
- Is `fixed-clerk-middleware.js` safe to delete, or is it referenced by something outside `app/`/`lib/` (e.g. a build/deploy step) that wasn't checked this session?
- Should `app/(root)/applications.tsx.old` and the checked-in `dist/` folder be removed?
