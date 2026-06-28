---
name: quickhands-remember
description: Save critical QuickHands client-app context at the end of a session and restore it at the start of the next one — features built, architecture decisions, design baseline — without ever storing secrets.
---

AI has no memory between sessions. This app spans Clerk auth, an external API, two socket.io concerns, push notifications, and a design system that's still mid-consolidation (see [[quickhands-imprint]]). Without a reliable handoff, every session re-derives the same context.

Run at the end of a session to save. Run at the start of a session to restore.

---

# Security Boundary

Never store:

- Clerk publishable/secret keys, session tokens, or `tokenCache` contents
- `DATABASE_URL`, `API_URL` / `EXPO_PUBLIC_API_URL` values if they ever carry credentials
- Expo push tokens, EAS auth tokens
- Any contact-exchange data (phone numbers, contact names) surfaced via the applications/hiring flow — this is real user PII, not just app config
- Any other user PII (emails, names tied to real accounts)

If a value matters but is sensitive, store `[REDACTED]` instead. When uncertain, treat it as sensitive.

---

# How To Invoke

```bash
/quickhands-remember save
/quickhands-remember restore
```

If invoked with no argument, ask: `Do you want to save or restore?`

---

# Save Mode

Capture only project state needed to resume work — not a transcript, not code.

## Product State

What flows are complete/in progress: job posting, hiring pipeline (accept/reject/contact-exchange/reviews), in-app + push notifications, conversation/coordination chat, location-based matching.

## Screens Touched

Be specific with paths, e.g.:

```text
app/(root)/applications.tsx — added shortlist + private notes
app/(root)/chat.tsx — coordination board entry point
```

## Architecture Decisions

Only decisions future work depends on, e.g.:

```text
Expo Router (file-based) for navigation.
Clerk for auth; waitForClerkToken() required for all authenticated calls.
No global state library — local useState + polling (10-15s) + two socket.io contexts.
All API access through lib/fetch.ts getApiUrl()/fetchAPI(), default host https://quickhands-api.onrender.com.
Sockets disabled automatically on *.vercel.app hosts — polling fallback is expected there, not a bug.
```

## Design System State

This is actively unconsolidated — record the *current* state, not an aspirational one:

```text
Font: Plus Jakarta Sans only (loaded via useFonts in app/_layout.tsx).
Primary green: NOT YET CONSOLIDATED — candidates in use: #15803d, #16a34a, #1A7F5A. Tailwind config declares #10B981 but it's not what screens actually use.
Styling: NativeWind className in newer screens, inline style in older ones — match the file, don't mix.
```

## Problems Solved

Capture non-obvious discoveries so they aren't re-debugged, e.g. (adjust to what actually happened this session):

```text
Notification socket required isUnsupportedSocketHost() guard for Vercel-hosted API — fixed in contexts/SocketContext.tsx.
Date picker added to service.tsx job form with start/end validation against "today".
Vicinity check added for nearby-freelancer matching.
```

## Current State

What works, what's partial, what's known-broken.

## Next Session Starts With

Exactly one concrete starting point.

## Open Questions

Unresolved decisions — the design-system consolidation (which green wins) belongs here until decided.

---

# What Not To Capture

Source code, large snippets, file contents, build logs, secrets (see boundary above).

---

# Where To Save

`memory.md` at repo root. One file, always represents the latest session. If it already exists, summarize its current contents and ask before overwriting.

---

# Memory Format

```markdown
# QuickHands Client-App Memory

Last Updated: [date]

## Product
[Client-side marketplace summary — job posting, hiring, messaging, reviews]

## Screens Touched
[List with paths]

## Architecture Decisions
[List — see above]

## Design System State
Font: Plus Jakarta Sans only
Primary green: [unconsolidated / decided value]
[Other notes]

## Problems Solved
[List]

## Current State
[List]

## Next Session Starts With
[Single actionable task]

## Open Questions
[List]
```

---

# Restore Mode

1. Look for `memory.md`. If missing: `No memory.md found. This appears to be a new session. Use /quickhands-remember save at the end of a session to create it.` Stop.
2. Read `memory.md`, then `CLAUDE.md`, `app-registry.md`, `Documentation.md` if present. Don't scan the whole repo.
3. Build understanding of product state, architecture decisions (cross-check against [[quickhands-client-architecture]] if it seems stale), design system state, next task.
4. Present the restoration summary and wait for confirmation before starting work:

```text
Memory restored.

Product: [summary]
Current State: [summary]
Architecture: [summary]
Design System: Plus Jakarta Sans / primary green [status]
Next Task: [summary]
Open Questions: [summary]

Is this correct? Say yes to continue or provide corrections.
```

If memory is incomplete, say so and ask whether to proceed with gaps or fill them first. Never guess or invent context.

---

# Rule

Every session ends with `/quickhands-remember save`. Every session starts with `/quickhands-remember restore`. Continuity here is especially important because the design system is mid-consolidation — losing that thread means re-fragmenting colors and fonts all over again.
