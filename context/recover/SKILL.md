---
name: quickhands-recover
description: When something breaks in the QuickHands client app, diagnose against this stack's real failure points (Clerk token timing, socket host limitations, Render/EAS config, location/push permissions) before attempting a fix.
---

This app combines Clerk auth, a Render-hosted API, socket.io realtime, and Expo/EAS — each has a specific, recurring failure shape in this codebase. Diagnose against the actual architecture (see [[quickhands-client-architecture]]) before patching.

---

# How To Invoke

```bash
/quickhands-recover
/quickhands-recover app/(root)/applications.tsx
/quickhands-recover contexts/SocketContext.tsx
```

---

# Step 1 — Understand The Failure

Ask:

```text
• What should happen, and what happens instead?
• Platform affected — iOS / Android / web / all?
• Does it happen right after sign-in, or any time?
• Dev build, Expo Go, or production build?
• How many fix attempts so far?
```

Do not diagnose yet — collect evidence first.

---

# Step 2 — Identify The Failure Mode

## Mode 1 — Localized Bug

One screen/component/call affected, clear error, first or second attempt. Response: targeted fix.

## Mode 2 — Auth / Token Timing Failure

**Signs:** API calls intermittently return 401 right after sign-in or app launch, but work fine after a manual refresh or a few seconds.

**Cause:** Clerk's session token isn't available the instant `isSignedIn` flips true. The fix in this codebase is always `waitForClerkToken()` ([lib/session.ts](lib/session.ts)), which retries up to 6 times with backoff — not a single `getToken()` call.

**Check:** does the failing call use `waitForClerkToken()`? If it calls `getToken()` directly and the failure is intermittent and time-sensitive, that's almost certainly the root cause.

## Mode 3 — Realtime / Socket Failure

**Signs:** notifications or chat messages don't arrive live, but the underlying REST endpoints return correct data when polled/refreshed manually.

**Check `isUnsupportedSocketHost()`** in [contexts/SocketContext.tsx](contexts/SocketContext.tsx) and [hooks/useMessagingSocket.ts](hooks/useMessagingSocket.ts) — if `EXPO_PUBLIC_API_URL` resolves to a `*.vercel.app` host, the socket connection is **deliberately** skipped because Vercel doesn't support persistent WebSockets. In that case the app should still work via the 15s (notifications) / 10s (conversations, applications) polling fallback. Don't "fix" this by forcing a socket connection — fix the host config, or accept polling-only behavior.

If the host *does* support sockets and it's still not connecting: check `connect_error` console warnings, and confirm the JWT passed in `auth: { token }` is valid (see Mode 2).

## Mode 4 — Backend Integration Failure

**Signs:** 404/500 from `quickhands-api.onrender.com`, slow first request, or `ensureBackendUser()` throwing on app launch.

**Check first:** `.env` defines `API_URL`/`DATABASE_URL` (unprefixed), but the app reads `EXPO_PUBLIC_API_URL`. If that var is unset, the app silently falls back to the hardcoded default in [lib/fetch.ts](lib/fetch.ts) — confirm which host is actually being hit before assuming the backend is broken. Render free-tier services also cold-start, which can look like a hang on the first request after idle.

`@neondatabase/serverless` / `DATABASE_URL` are not live integration points in this app — don't go looking for a direct DB connection here when diagnosing.

## Mode 5 — Location / Push Permission Failure

**Signs:** city/location stays blank in `home.tsx` / `service.tsx`, or push notifications never arrive.

**Location:** check `expo-location` permission grant; `getCurrentPositionAsync` + `reverseGeocodeAsync` fail silently into `city: null` by design (try/catch swallows errors), so "no location shown" doesn't always mean a crash — check `locationLoading`/`city` state, not just for thrown errors.

**Push:** `lib/pushNotifications.ts` requires a resolvable EAS `projectId` (`getProjectId()`); if missing, registration **silently no-ops** with a `console.warn` only — this is intentional, not a bug to "fix" with a thrown error. Also requires notification permission grant and a valid Clerk token (Mode 2 again) to PATCH `/api/user/me/push-token`.

## Mode 6 — Expo / Metro / Cache Failure

**Signs:** NativeWind class has no visible effect, or changes don't show up after edits.

**Check:** is the edited file path covered by `tailwind.config.js` `content` globs? Try clearing Metro cache (`expo start -c`) before assuming the styling logic itself is wrong.

## Mode 7 — Polluted Session / Wrong Architecture

Same as a general React Native project: 5+ fix attempts, unrelated patches piling up → stop and do a Hard Reset writeup. Feature built on a flawed assumption (e.g. treating sockets as guaranteed-available, or assuming direct DB access) → Architecture Rethink.

---

Report diagnosis before fixing:

```text
Diagnosis:
Failure Mode: [Type]
Reason: [Explanation, tied to the specific check above]
Recommended Recovery: [Targeted Fix / Auth Recovery / Socket Recovery / Backend Recovery / Permission Recovery / Cache Reset / Hard Reset / Architecture Rethink]
```

---

# Mobile-Specific Notes For This Project

- EAS project: `c512aa05-9d47-4ad0-aafe-17cfae9f48c0`, owner `bigcat87` — push registration and OTA updates depend on this resolving correctly.
- Android `app.json` permissions list `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` duplicated — harmless, not a bug to "clean up" during an unrelated fix.
- Large lists: `applications.tsx` (nested job→application loop, not virtualized) and `chat.tsx` (FlatList) — if performance is the complaint, check for unnecessary re-renders from the 10s poll interval before assuming it's a list-virtualization issue.
- `app/(root)/applications.tsx.old` is dead — never diagnose against it or assume it's the active file.

---

# Recovery Principle

Never fix what you haven't diagnosed against the actual failure mode above. A symptom like "data is stale" can mean Mode 2 (token), Mode 3 (socket gated off), or simply the 10–15s poll interval hasn't ticked yet — confirm which before changing code.
