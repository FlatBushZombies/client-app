// Shared layout scale. Pick from these instead of hardcoding new numbers —
// see context/imprint/SKILL.md for the audit that motivated this file.

export const SPACING = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const

export const RADIUS = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
} as const

// "content" = tab/list/form screens. "hero" = full-bleed marketing/entry screens
// (landing, sign-in, onboarding, the pre-modal service entry screen).
export const SCREEN_PADDING = {
  content: SPACING.lg,
  hero: 28,
} as const

export const BUTTON = {
  paddingVertical: SPACING.md,
  radius: RADIUS.pill,
} as const
