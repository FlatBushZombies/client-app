"use client"

import { useEffect } from "react"
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { useUser } from "@clerk/clerk-expo"
import { router } from "expo-router"
import OAuth from "@/components/OAuth"

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  white:      "#FFFFFF",
  bg:         "#FFFFFF",
  navy:       "#1E2A3A",
  navyDark:   "#152030",
  navyMid:    "#243244",
  navyLight:  "#2D3F54",
  textPrimary:"#111827",
  textSub:    "#6B7280",
  textMuted:  "#9CA3AF",
  border:     "#F0F2F5",
  cardBg:     "#F8F9FC",
  stepLine:   "#E5E7EB",
}

// ─── Step component ───────────────────────────────────────────────
const Step = ({ index, text }: { index: number; text: string }) => {
  const isLast = index === 3
  return (
    <View style={styles.stepOuter}>
      {/* left column: number + connector line */}
      <View style={styles.stepLeft}>
        <View style={styles.stepBubble}>
          <Text style={styles.stepNum}>{index}</Text>
        </View>
        {!isLast && <View style={styles.stepLine} />}
      </View>

      {/* right column: text */}
      <View style={styles.stepRight}>
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────
const SignIn = () => {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      router.replace("/(root)/home")
    }
  }, [isLoaded, user])

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.loadingRoot}>
        <View style={styles.loadingInner}>
          <View style={styles.loadingLogoMark}>
            <Text style={styles.loadingQ}>Q</Text>
          </View>
          <ActivityIndicator size="small" color={C.navy} style={{ marginTop: 24 }} />
          <Text style={styles.loadingText}>Preparing your workspace…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (user) return null

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>

        {/* ── Logo mark ── */}
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoQ}>Q</Text>
          </View>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoWordmark}>QuickHands</Text>
          </View>
        </View>

        {/* ── Hero ── */}
        <View style={styles.heroWrap}>
          <Text style={styles.heroTitle}>
            Post a task.{"\n"}
            <Text style={styles.heroTitleAccent}>Get it done.</Text>
          </Text>
          <Text style={styles.heroSub}>
            From errands to professional help, post a task and connect
            with trusted people ready to help — fast.
          </Text>
        </View>

        {/* ── Steps ── */}
        <View style={styles.stepsWrap}>
          <Step index={1} text="Describe the task you need done" />
          <Step index={2} text="Receive offers from nearby helpers" />
          <Step index={3} text="Select the best fit and relax" />
        </View>

        {/* ── Auth card ── */}
        <View style={styles.authCard}>
          {/* top rule with label */}
          <View style={styles.authLabelRow}>
            <View style={styles.authRule} />
            <Text style={styles.authLabel}>Sign in to continue</Text>
            <View style={styles.authRule} />
          </View>

          <View style={{ marginTop: 20 }}>
            <OAuth />
          </View>
        </View>

        {/* ── Spacer ── */}
        <View style={{ flex: 1 }} />

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Built for people who value speed and reliability
          </Text>
        </View>

      </View>
    </SafeAreaView>
  )
}

export default SignIn

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Loading ───────────────────────────────────────────────────
  loadingRoot: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingInner: {
    alignItems: "center",
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
  },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 16,
  },

  // ── Logo ──────────────────────────────────────────────────────
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 44,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  logoQ: {
    fontSize: 24,
    fontWeight: "900",
    color: C.navyDark,
    lineHeight: 30,
  },
  logoTextWrap: {
    gap: 4,
  },
  logoWordmark: {
    fontSize: 16,
    fontWeight: "800",
    color: C.textPrimary,
    letterSpacing: -0.4,
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroWrap: {
    marginBottom: 40,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: C.textPrimary,
    lineHeight: 48,
    letterSpacing: -1.2,
    marginBottom: 14,
  },
  heroTitleAccent: {
    color: C.navy,
  },
  heroSub: {
    fontSize: 15,
    color: C.textSub,
    lineHeight: 24,
    maxWidth: 320,
  },

  // ── Steps ─────────────────────────────────────────────────────
  stepsWrap: {
    marginBottom: 40,
  },
  stepOuter: {
    flexDirection: "row",
  },
  stepLeft: {
    alignItems: "center",
    width: 36,
    marginRight: 16,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: "700",
    color: C.white,
  },
  stepLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: C.stepLine,
    marginTop: 4,
    marginBottom: 0,
    minHeight: 20,
  },
  stepRight: {
    flex: 1,
    paddingBottom: 24,
    justifyContent: "center",
  },
  stepText: {
    fontSize: 14,
    color: C.textSub,
    lineHeight: 22,
    letterSpacing: 0.1,
  },

  // ── Auth card ─────────────────────────────────────────────────
  authCard: {
    backgroundColor: C.cardBg,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  authLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  authRule: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  authLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMuted,
    letterSpacing: 0.3,
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    alignItems: "center",
    paddingBottom: 20,
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: C.textMuted,
    letterSpacing: 0.2,
  },
})