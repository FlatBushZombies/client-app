---
name: quickhands-review
description: After building a feature in the QuickHands client app, verify it matches what was planned, respects this codebase's architecture and design conventions, and is production ready. Reports issues clearly; does not fix them.
---

Building is not done when the code runs. It is done when it's correct *for this codebase* — which currently means: calls go through the established API/auth helpers, sockets respect the host gating, and styling doesn't add a fifth shade of green. Run this after every feature, before moving on.

## What This Skill Does Not Do

It does not fix anything. It reports findings and lets the developer decide. Fixing without understanding buries problems instead of solving them.

---

## Step 1 — Understand What Should Have Been Built

Read, in order: the implementation plan if one exists, the feature description/task given, and the relevant context skills — [[quickhands-client-architecture]], [[quickhands-imprint]]. If no plan exists, ask the developer what the feature was supposed to do before reviewing.

---

## Step 2 — Review in Three Layers

### Layer 1 — Does it match the plan?

Compare against what was planned: every part of the feature description present? Decisions made during planning reflected in the code? Did the implementation stay in scope, or add things that weren't asked for?

### Layer 2 — Does it respect the system?

This is where drift happens fastest in this codebase specifically. Check:

- **Auth boundary** — does every authenticated call resolve its token via `waitForClerkToken()` ([lib/session.ts](lib/session.ts)) rather than a single `getToken()`? A single call is the most common source of intermittent 401s here.
- **API boundary** — does the call go through `getApiUrl()` (and ideally `fetchAPI()`) from [lib/fetch.ts](lib/fetch.ts) rather than a hardcoded host string?
- **Socket boundary** — if realtime was added, does it check `isUnsupportedSocketHost()` before relying on a live socket connection, with a polling fallback in place? Don't let a feature assume sockets are always available.
- **Routing conventions** — does the screen live under the right `app/(auth)` vs `app/(root)` group? Does a new tab actually need a visible tab entry, or should it be hidden (`href: null`) like `notifications.tsx`?
- **Design system drift** — any new hex color introduced instead of reusing one of the existing greens (see [[quickhands-imprint]])? Any font family referenced that isn't in `useFonts` (`app/_layout.tsx`)? Does the file mix NativeWind `className` and inline `style` for the same kind of element, or does it consistently follow whichever approach its neighbors already use?
- **State management** — does it stick to local `useState`/`useEffect` + polling/context, or does it quietly introduce a new state library/pattern that the rest of the app doesn't use?
- **TypeScript** — are new API response shapes typed (like `Application`, `Job`, `ServerMessage` elsewhere) rather than left as untyped `any`?

### Layer 3 — Is it production ready?

- **Error handling** — do fetch calls have a catch path that surfaces something to the user (`Alert.alert`, inline error text), matching the pattern in `applications.tsx`/`service.tsx`, rather than failing silently?
- **Loading/empty/error states** — does the screen show a loading indicator, an empty state (like "No applications yet" in `applications.tsx`), and a visible error state, not just a blank screen?
- **Permission flows** — if location or push notifications are involved, does it handle the denied-permission path gracefully (the existing pattern is: degrade silently to a "unavailable" label, don't crash or block)?
- **Console warnings/errors** — anything unexpected in the Metro/device logs?
- **Obvious bugs** — anything that would clearly break for a real user (e.g. unguarded `user!.id`, a date comparison that doesn't account for timezones, a missing `cancelled` guard on an async effect)?

---

## Step 3 — Report What You Found

```
## Review — [Feature Name]

### Layer 1 — Plan alignment
[PASS / ISSUES FOUND]

### Layer 2 — System integrity
[PASS / ISSUES FOUND]
[Architecture/auth/socket/design-system/state violations, with file:line]

### Layer 3 — Production readiness
[PASS / ISSUES FOUND]
[Error handling, states, bugs]

### Summary
[X] issues found across [Y] layers.
[If none: "No issues found. This feature is ready to ship."]
```

---

## Step 4 — Let the Developer Decide

Stop after reporting. Don't start fixing or suggest fixes unless asked. Wait for the developer to ask for a specific fix, mark something intentional, or confirm it's ready.

---

## Severity Guide

**Critical — fix before moving on**
- Authenticated call using `getToken()` directly instead of `waitForClerkToken()` (will intermittently 401 in production)
- Missing error handling causing a silent failure on a user-initiated action (post job, accept application, send message)
- Planned functionality completely missing

**Important — fix soon**
- New color/font value introduced instead of reusing an existing one
- Direct `fetch()` with a hardcoded host instead of `getApiUrl()`
- Missing empty/error state on a list screen
- Socket usage with no polling fallback for unsupported hosts

**Minor — fix when convenient**
- Mixing `className` and inline `style` within one new file
- Naming inconsistencies that don't affect behavior
- Missing memoization on a list with no real performance symptom yet

---

## The Standard

The question is not "does it work?" — it's "does it still fit this app once it's in?" A feature that adds a new green, bypasses `waitForClerkToken()`, or assumes a socket is always connected can work in the demo and break — or quietly drift the design — in production.
