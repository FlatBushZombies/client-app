---
name: quickhands-client-architecture
description: Defines the QuickHands client-app architecture — Expo Router screens, Clerk auth, the external API, the realtime layer, and the styling system — so changes respect existing structure instead of drifting into new patterns.
---

# What This App Is

QuickHands client-app is the **client/job-poster** side of a service marketplace (the counterpart "specialist/freelancer" app is a separate codebase, not present here). A client signs up, posts a job ("task"), receives applications from freelancers, hires one, coordinates via in-app messaging, and leaves a review. There is no local database — this app is a thin client over a remote API.

Use this skill whenever you're about to add a screen, hook, or integration and need to know where it belongs.

---

# Tech Stack

| Concern | Library | Notes |
|---|---|---|
| Runtime | Expo SDK 54, React Native 0.81, React 19 | `newArchEnabled: true`, `experiments.reactCompiler: true` |
| Routing | `expo-router` v6, file-based, typed routes | Groups: `app/(auth)`, `app/(root)` |
| Auth | `@clerk/clerk-expo` | Session + OAuth (Google) |
| Styling | NativeWind v4 / Tailwind | Configured but inconsistently applied — see [[quickhands-imprint]] |
| Realtime | `socket.io-client` | Two independent socket concerns, see below |
| Push | `expo-notifications` | Token registered against the API per signed-in user |
| Location | `expo-location` | Used for nearby-freelancer job matching |
| Local persistence | `expo-secure-store` | Clerk token cache + locally-saved job templates |
| Icons | `@expo/vector-icons` (Ionicons), `react-native-heroicons`, `lucide-react-native` | Three icon sets in active use — don't add a fourth |

---

# Backend Boundary

All data lives behind an external REST + WebSocket API, never accessed directly:

- Base URL: `EXPO_PUBLIC_API_URL`, defaulting to `https://quickhands-api.onrender.com` ([fetch.ts](lib/fetch.ts))
- Every request must go through `getApiUrl()` / `fetchAPI()` in [lib/fetch.ts](lib/fetch.ts) — they normalize `/(api)/` paths and absolute URLs consistently. Screens that call `fetch(getApiUrl(...))` directly instead of `fetchAPI()` (most of them currently do) are following an established, if imperfect, pattern — don't "fix" this mid-feature.
- `@neondatabase/serverless` and `DATABASE_URL` (`.env`) are leftovers from a fullstack starter template. **This client app never queries Postgres directly.** Don't build a feature assuming direct DB access exists here.

---

# Auth Flow

1. `lib/auth.ts` exports `tokenCache` (SecureStore-backed, used by `ClerkProvider`) and `googleOAuth()`.
2. `lib/session.ts: waitForClerkToken(getToken)` retries up to 6 times — Clerk's session token is not always immediately available right after sign-in/app-launch. **Every** authenticated fetch or socket connection in this app uses this helper instead of calling `getToken()` once. Follow it for new authenticated calls.
3. `lib/userSync.ts: ensureBackendUser(user)` looks up or lazily creates the backend user row by `clerkId`. Called from [app/index.tsx](app/index.tsx) on every load and after OAuth ([lib/auth.ts](lib/auth.ts)).
4. Onboarding gate: `user.unsafeMetadata.completedOnboarding` (Clerk user metadata, not a backend field) decides whether `app/index.tsx` / `signin.tsx` route to `(auth)/onboarding` or `(root)/home`.

---

# Routing Map

```
app/_layout.tsx              Root: ClerkProvider → SocketProvider → Stack
app/index.tsx                 Landing/redirect gate (auth + onboarding check)
app/(auth)/signin.tsx         Sign-in (Google OAuth via components/OAuth.tsx)
app/(auth)/onboarding.tsx     Swiper-based onboarding, sets completedOnboarding
app/(root)/_layout.tsx        Bottom tabs: home, service, chat, profile, applications
app/(root)/home.tsx           Search + discovery + job search
app/(root)/service.tsx        "Post a task" entry + job-creation modal/form
app/(root)/applications.tsx   Hiring pipeline: review applicants, accept/reject, contact exchange, reviews
app/(root)/chat.tsx           Conversation list + coordination board (per-job messaging)
app/(root)/profile.tsx        Account stats, settings, sign-out
app/(root)/notifications.tsx  Hidden tab (href: null), reached via push/banner only
```

`app/(root)/applications.tsx.old` is dead code left in the tree — do not edit it, and don't treat it as a reference pattern.

---

# Realtime Layer (two independent systems)

1. **App-wide notifications** — [contexts/SocketContext.tsx](contexts/SocketContext.tsx). Connects one socket per signed-in user, listens for `notification:new`, and *also* polls `/api/notifications/by-clerk/:id` every 15s as a fallback/source of truth merge. Drives the tab-bar unread badge and the in-app banner in `app/_layout.tsx`.
2. **Per-conversation chat** — [hooks/useMessagingSocket.ts](hooks/useMessagingSocket.ts) + [hooks/useMessagingConversations.ts](hooks/useMessagingConversations.ts), rendered by [components/messaging/ConversationChatScreen.tsx](components/messaging/ConversationChatScreen.tsx) from `chat.tsx`. Conversation list polls every 10s; messages join a socket.io room (`join_conversation`) with an HTTP send fallback if the socket isn't connected.

Both systems call `isUnsupportedSocketHost(serverUrl)` and silently disable the live socket (falling back to polling only) when the API host is `*.vercel.app`, since Vercel doesn't support persistent WebSocket connections. This is a deliberate guard, not a bug.

---

# Styling System

NativeWind/Tailwind is configured ([tailwind.config.js](tailwind.config.js): `primary: #10B981`, `font-jakarta*` families), but in practice screens are split between NativeWind `className` strings and raw inline `style={{}}` objects, and use several different green hex values rather than the configured `primary`. This drift is tracked, not endorsed — see [[quickhands-imprint]] before adding a new color or font reference.

Only the **Plus Jakarta Sans** family is actually loaded via `useFonts` in `app/_layout.tsx`. Any `DMSans-*` / `DMSerifDisplay-*` references (present in `home.tsx`) silently fall back to the system font — known bug, not a pattern to copy.

---

# State Management

No Redux/Zustand/React Query. State is local `useState`/`useEffect` per screen, plus two React Contexts (`SocketProvider`) for cross-screen realtime data. Server data is fetched ad hoc with manual polling intervals (10–15s) rather than a caching layer — match this pattern unless explicitly asked to introduce a data-fetching library.

---

# Known Leftovers / Things to Verify Before Relying On

- `fixed-clerk-middleware.js` at repo root — purpose isn't wired into `app/` routing; confirm it's actually used before assuming it affects behavior.
- `dist/` build output is checked into the working tree.
- `.env` defines `API_URL` and `DATABASE_URL` (no `EXPO_PUBLIC_` prefix), but the app code reads `EXPO_PUBLIC_API_URL` — these are not the same variable. If API calls seem to hit the wrong host, check this mismatch first.
