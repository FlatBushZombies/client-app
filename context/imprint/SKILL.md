---
name: quickhands-imprint
description: After building any QuickHands screen or component, capture the design patterns actually used (color, radius, font, navigation) into app-registry.md so new work converges on one system instead of adding a fourth shade of green.
---

This app does not yet have one locked design system — it has several, layered over time. Tailwind config declares a primary color and font scale that most screens ignore in favor of hand-picked hex values and inline styles. This skill's job is to slow that drift: every time a screen is built or touched, record what it actually used, and push toward the smallest possible set of values rather than inventing a new one.

Run it after building or meaningfully touching a screen. See [[quickhands-client-architecture]] for the full stack context.

---

# Current State of the System (read before adding anything new)

## Color — fragmented, needs convergence

`tailwind.config.js` declares:

```text
primary: #10B981
error:   #F14141
success: #2F9B65
```

But the screens that exist today use **different greens** for the same "primary brand action" role:

| Value | Where seen |
|---|---|
| `#15803d` / `green-700` | `index.tsx`, `signin.tsx`, `home.tsx` accents |
| `#16a34a` | `(root)/_layout.tsx` active tab, `home.tsx` location dot |
| `#1A7F5A` | `service.tsx` form accents/icons |
| `#0A1F16` / `#0f1f14` | `service.tsx` hero background, `home.tsx` CTA button |

**Do not add a fifth green.** If a new screen needs the brand color, ask whether to (a) match the nearest existing screen's value for consistency with its neighbors, or (b) use this as the moment to consolidate on `#10B981` from the Tailwind config. Don't decide silently — flag it.

## Fonts — only one family is real

Only Plus Jakarta Sans is loaded (`app/_layout.tsx` `useFonts`): `PlusJakartaSans_400Regular/500Medium/600SemiBold/700Bold`, exposed as Tailwind classes `font-jakarta`, `font-jakarta-medium`, `font-jakarta-semibold`, `font-jakarta-bold`.

`home.tsx` references `DMSans-Regular`, `DMSans-Medium`, `DMSans-SemiBold`, `DMSerifDisplay-Regular`, `DMSerifDisplay-Italic` — none of these are registered, so they silently render in the system default font. Treat this as a known bug, not a font system to extend. Never reference a font family string without first adding it to `useFonts`.

## Icons — three sets, intentionally

- `react-native-heroicons` (outline + solid) — bottom tab bar only (`(root)/_layout.tsx`)
- `@expo/vector-icons` Ionicons — most screen-level icons (`home.tsx`, `service.tsx`, `applications.tsx`, `notifications.tsx`, `onboarding.tsx`)
- `lucide-react-native` — `profile.tsx` only

Match whichever set the file you're editing already uses. Don't introduce a fourth library.

## Styling approach — className vs inline style

NativeWind `className` strings are used in `service.tsx`, `profile.tsx`, `applications.tsx`, `onboarding.tsx`, `signin.tsx`. Raw inline `style={{}}` objects dominate `home.tsx`, `notifications.tsx`, `chat.tsx`'s `StyleSheet.create`, and the tab bar. Both are "correct" in the sense that they're each used consistently *within* their own file — the rule is: match the file you're in, don't mix both approaches in one component, and prefer `className` for brand-new files since NativeWind is the configured system.

## API calls — established helper

`lib/fetch.ts` exports `getApiUrl()` and `fetchAPI()`. Most screens call `fetch(getApiUrl(path))` directly rather than `fetchAPI()`; this is the established convention here, not a problem to fix in passing. Authenticated calls should resolve the token via `waitForClerkToken()` (`lib/session.ts`), not a single `getToken()`.

---

# Reusable Component Patterns Already in the Codebase

- **`Card`** (`service.tsx`) — white rounded section with a left accent bar + title row. Use for new form sections instead of inventing a new card style.
- **`Field`** (`service.tsx`) — labelled text input with icon, focus-state border color change.
- **`DateField`** (`service.tsx`) — labelled date trigger opening the inline calendar sheet.
- **`StatusPill`**, **`MetricCard`** (`applications.tsx`) — status/metric chips with a `tone` prop (`green`/`amber`/`blue`).
- **`TabIcon`** (`(root)/_layout.tsx`) — pill-background tab icon with badge support.

---

# How To Invoke

```bash
/quickhands-imprint
/quickhands-imprint app/(root)/home.tsx
/quickhands-imprint audit
```

---

# Step 1 — Discover What Was Built

Read the screen/component. Identify: purpose, user actions, navigation behavior, data source (which API endpoint(s)), component composition, loading/empty/error states, and which color/font/icon values it introduced.

If nothing can be identified, ask: `Which screen should I capture patterns from?`

---

# Step 2 — Extract Patterns

Capture only what's reusable, and flag anything that adds a *new* value to an already-fragmented category (color, font) rather than reusing an existing one.

Capture per the categories above: layout (padding/gap), navigation, color usage (and whether it matches an existing value or is new), button/form patterns, data-fetching pattern (poll interval, auth header), loading/empty/error state handling.

---

# Step 3 — Write To app-registry.md

Create `app-registry.md` at repo root if missing. Append/update entries, never duplicate. Format:

```markdown
## [Screen Name]

File: [path]
Last Updated: [date]

### Layout
| Property | Value |
|-----------|--------|

### Color values introduced or reused
[list, flag anything new]

### Navigation
[patterns]

### Data
[endpoint(s), polling interval, auth method]

### States
Loading / Empty / Error: ...

### Notes
[reusable decisions]
```

---

# Step 4 — Confirm Capture

```text
Imprinted [Screen Name] → app-registry.md

Captured: layout, color usage, navigation, data, states.

Flagged: [any new color/font value introduced — confirm before treating as canon]
```

---

# Audit Mode

```bash
/quickhands-imprint audit
```

Scan all screens for:

- Green hex values that don't match the others (candidates for consolidation)
- Any font family string not in `useFonts` (`app/_layout.tsx`)
- Files mixing NativeWind `className` and inline `style` for the same kind of element
- Direct `fetch()` calls that bypass `getApiUrl()` (hardcoded hosts)
- Authenticated calls using `getToken()` directly instead of `waitForClerkToken()`

---

# Baseline (working, not yet final — update once a color decision is made)

```text
Font: Plus Jakarta Sans only (font-jakarta / -medium / -semibold / -bold)
Tailwind primary token: #10B981 (declared, not consistently used)
Observed in-practice green: #15803d / #16a34a / #1A7F5A (pick one before next screen)
Card radius: 24-30 (varies: applications.tsx uses 28-30, service.tsx uses 18)
Input radius: 12-16
```

---

# Rule

Build screen → run `/quickhands-imprint` → update `app-registry.md`. The goal is convergence: every imprint should make the system more consistent than it was, not just document the divergence.
