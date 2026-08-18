// Centralized color + shadow tokens. Brand greens are the app's own identity
// (CTAs, focus states) — everything else (warm cream background, soft
// diffused shadows, pastel accent-badge trio, generous radii) follows the
// reference visual system: soft, rounded, warm, editorial. Pick from these
// instead of hardcoding new hex literals.

export const COLORS = {
  primary: "#059669", // PostJobModal submit button / focus states
  primaryDark: "#047857", // PostJobModal optionTitleActive
  primarySoft: "#ECFDF5", // PostJobModal locationBannerDetected background
  surface: "#FFFFFF",
  surfaceMuted: "#F7F4EE", // warm off-white card/section fill, not cool gray
  background: "#F8F4EB", // warm cream screen background (was cool #F8FAFC)
  border: "#EAE3D6", // warm-toned hairline (was cool #E2E8F0)
  borderSoft: "#F0EBDF",
  borderDashed: "#D9CFBD", // dashed "add another" style borders
  textPrimary: "#1C1B18", // warm near-black, not cool navy-black
  textSecondary: "#8A8578",
  textMuted: "#B5AF9F",
  badgeRed: "#EF4444", // home.tsx notification badge
  info: "#2563EB", // home.tsx "Find a Pro" icon chip
  infoSoft: "#EFF6FF", // home.tsx "Find a Pro" icon chip background

  // Pastel accent trio — icon-badge circles + status pills. Green reuses the
  // brand color as its own accent; purple/amber are new for variety across
  // categories/badges (e.g. "Trending now" / "Classic favourite" / "Top pick").
  accentGreenSoft: "#DFF3E4",
  accentGreen: "#22C55E",
  accentPurpleSoft: "#EFE4FB",
  accentPurple: "#9B59F6",
  accentAmberSoft: "#FCF0D9",
  accentAmber: "#F0B429",
} as const

export const SHADOW = {
  // Warm, diffused shadow — cards feel like they float on cream, not on
  // cool gray. Low opacity + large radius, minimal offset.
  card: {
    shadowColor: "#8A6D3F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  raised: {
    shadowColor: "#8A6D3F",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 8,
  },
} as const

// Brand gradient already used by the home screen FAB — reuse the exact stops
// anywhere a gradient CTA is needed so greens stay consistent.
export const GRADIENT = {
  brand: ["#1e9e68", "#0a1f14"] as [string, string],
} as const
