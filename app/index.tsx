"use client"

import { useEffect } from "react"
import { Text, View, TouchableOpacity, ActivityIndicator, Image, StyleSheet, Platform } from "react-native"
import { router } from "expo-router"
import { useAuth } from "@clerk/clerk-expo"
import { IMAGES } from "@/constants"

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  bg:          "#FFFFFF",
  navy:        "#1A7A4A",
  navyDark:    "#145E38",
  textPrimary: "#111827",
  textSub:     "#6B7280",
  textMuted:   "#9CA3AF",
  border:      "#F0F2F5",
  borderMid:   "#E5E7EB",
  white:       "#FFFFFF",
}

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(root)/home")
    }
  }, [isLoaded, isSignedIn])

  const handleGetStarted = () => {
    if (isSignedIn) {
      router.replace("/(root)/home")
    } else {
      router.replace("/(auth)/signin")
    }
  }

  const handleBrowseServices = () => {
    router.replace("/(auth)/signin")
  }

  if (!isLoaded) {
    return (
      <View style={styles.loadingRoot}>
        <View style={styles.loadingLogoMark}>
          <Text style={styles.loadingQ}>Q</Text>
        </View>
        <ActivityIndicator size="small" color={C.navy} style={{ marginTop: 24 }} />
      </View>
    )
  }

  if (isSignedIn) {
    return (
      <View style={styles.loadingRoot}>
        <View style={styles.loadingLogoMark}>
          <Text style={styles.loadingQ}>Q</Text>
        </View>
        <ActivityIndicator size="small" color={C.navy} style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Redirecting…</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>

      {/* ── decorative top corner rings ── */}
      <View style={styles.ringTopRight} />
      <View style={styles.ringTopRight2} />

      <View style={styles.container}>

        {/* ── Centre: logo + headline ── */}
        <View style={styles.centreWrap}>

          {/* logo */}
          <View style={styles.logoShadowWrap}>
            <Image
              source={IMAGES.logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* wordmark */}
          <Text style={styles.wordmark}>QuickHands</Text>

          {/* divider */}
          <View style={styles.divider} />

          {/* headline */}
          <Text style={styles.headline}>
            Find specialists{"\n"}to help with{"\n"}your task
          </Text>

          {/* subtitle */}
          <Text style={styles.subtitle}>
            Connect with top-tier specialists{"\n"}to get the job done.
          </Text>
        </View>

        {/* ── Bottom: CTAs ── */}
        <View style={styles.ctaWrap}>

          {/* primary CTA */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleGetStarted}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>
              {isSignedIn ? "Continue to Home" : "I want to look for services"}
            </Text>
            <View style={styles.primaryArrow}>
              <Text style={styles.primaryArrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* secondary CTA */}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleBrowseServices}
            activeOpacity={0.65}
          >
            <Text style={styles.secondaryBtnText}>I want to offer services</Text>
          </TouchableOpacity>

          {/* trust indicator */}
          <View style={styles.trustRow}>
            <View style={styles.trustDot} />
            <Text style={styles.trustText}>Access top-tier specialists</Text>
          </View>
        </View>

      </View>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Loading ───────────────────────────────────────────────────
  loadingRoot: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingLogoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  loadingQ: {
    fontSize: 30,
    fontWeight: "900",
    color: C.navyDark,
    lineHeight: 36,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: C.textMuted,
    letterSpacing: 0.2,
  },

  // ── Root ──────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: C.bg,
    overflow: "hidden",
  },

  // ── Decorative rings (top-right corner) ───────────────────────
  ringTopRight: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    top: -120,
    right: -100,
  },
  ringTopRight2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#EDEEF2",
    top: -60,
    right: -40,
  },

  // ── Layout ────────────────────────────────────────────────────
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },

  // ── Centre block ──────────────────────────────────────────────
  centreWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
  },

  logoShadowWrap: {
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 24,
  },

  wordmark: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textMuted,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
  },

  divider: {
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.navy,
    marginBottom: 24,
  },

  headline: {
    fontSize: 42,
    fontWeight: "800",
    color: C.textPrimary,
    lineHeight: 52,
    letterSpacing: -1.3,
    marginBottom: 18,
  },

  subtitle: {
    fontSize: 15,
    color: C.textSub,
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  // ── CTA block ─────────────────────────────────────────────────
  ctaWrap: {
    gap: 0,
  },

  primaryBtn: {
    backgroundColor: C.navy,
    borderRadius: 18,
    paddingVertical: 18,
    paddingLeft: 24,
    paddingRight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
    marginBottom: 16,
  },
  primaryBtnText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
    flex: 1,
  },
  primaryArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  primaryArrowText: {
    color: C.white,
    fontSize: 16,
  },

  secondaryBtn: {
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.borderMid,
    borderRadius: 18,
    marginBottom: 24,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textSub,
    letterSpacing: 0.1,
  },

  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trustDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.navy,
    opacity: 0.4,
  },
  trustText: {
    fontSize: 12,
    color: C.textMuted,
    letterSpacing: 0.3,
  },
})