// Centralized color + shadow tokens. Values are consolidated from what the app
// already used: brand greens from components/PostJobModal.tsx (the polished
// reference), slate scale from PostJobModal.tsx, hairline/badge values from
// app/(root)/home.tsx. Pick from these instead of hardcoding new hex literals.

export const COLORS = {
  primary: "#059669", // PostJobModal submit button / focus states
  primaryDark: "#047857", // PostJobModal optionTitleActive
  primarySoft: "#ECFDF5", // PostJobModal locationBannerDetected background
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC", // PostJobModal root background
  background: "#F8FAFC",
  border: "#E2E8F0", // PostJobModal input/chip borders
  borderSoft: "#F0F0EE", // home.tsx existing hairline border
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  badgeRed: "#EF4444", // home.tsx notification badge
} as const

export const SHADOW = {
  card: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  raised: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
} as const

// Brand gradient already used by the home screen FAB — reuse the exact stops
// anywhere a gradient CTA is needed so greens stay consistent.
export const GRADIENT = {
  brand: ["#1e9e68", "#0a1f14"] as [string, string],
} as const
