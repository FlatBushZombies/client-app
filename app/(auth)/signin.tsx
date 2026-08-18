"use client"

import { useEffect } from "react"
import {
  View,
  Text,
  ActivityIndicator,
  Image,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useUser } from "@clerk/clerk-expo"
import { router } from "expo-router"
import OAuth from "@/components/OAuth"
import { IMAGES } from "@/constants"
import { COLORS, GRADIENT, SHADOW } from "@/constants/theme"

// ─── Step component ───────────────────────────────────────────────
const Step = ({ index, text }: { index: number; text: string }) => {
  const isLast = index === 3
  return (
    <View className="flex-row">
      {/* left column: number + connector line */}
      <View className="items-center w-10 mr-4">
        <LinearGradient
          colors={GRADIENT.brand}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "rgba(255,255,255,0.4)",
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "800",
              color: "#FFFFFF",
              fontFamily: "PlusJakartaSans_700Bold",
              fontVariant: ["tabular-nums"],
            }}
          >
            {index}
          </Text>
        </LinearGradient>
        {!isLast && <View className="w-px flex-1 mt-1.5 min-h-5" style={{ backgroundColor: COLORS.border }} />}
      </View>

      {/* right column: text */}
      <View className="flex-1 pb-6 justify-center">
        <Text className="text-sm leading-relaxed tracking-wide font-jakarta" style={{ color: COLORS.textSecondary }}>{text}</Text>
      </View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────
const SignIn = () => {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      // Check if user has completed onboarding
      const completedOnboarding = user.unsafeMetadata?.completedOnboarding
      
      if (completedOnboarding) {
        router.replace("/(root)/home")
      } else {
        router.replace("/(auth)/onboarding")
      }
    }
  }, [isLoaded, user])

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background }}>
        <View className="items-center">
          <Image
            source={IMAGES.logo}
            style={{ width: 64, height: 64, borderRadius: 18 }}
            resizeMode="contain"
          />
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 24 }} />
          <Text className="mt-3 text-sm tracking-wide font-jakarta" style={{ color: COLORS.textMuted }}>Preparing your workspace…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (user) return null

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      {/* ── decorative corner ring, echoes index.tsx entry screen ── */}
      <View
        className="absolute w-[220px] h-[220px] rounded-full"
        style={{ top: -90, right: -70, borderWidth: 1, borderColor: COLORS.borderSoft }}
      />

      <View className="flex-1 px-7 pt-4">

        {/* ── Logo mark ── */}
        <View className="flex-row items-center gap-3 mb-11">
          <Image
            source={IMAGES.logo}
            style={{ width: 44, height: 44, borderRadius: 12 }}
            resizeMode="contain"
          />
          <View className="gap-1">
            <Text className="text-base font-extrabold tracking-tight font-jakarta-bold" style={{ color: COLORS.textPrimary }}>QuickHands</Text>
          </View>
        </View>

        {/* ── Hero ── */}
        <View className="mb-10">
          <Text className="text-4xl font-extrabold leading-tight tracking-tighter mb-3.5 font-jakarta-bold" style={{ color: COLORS.textPrimary }}>
            Post a task.{"\n"}
            <Text style={{ fontFamily: "DMSerifDisplay_400Regular_Italic", color: COLORS.primary, fontSize: 40 }}>
              Get it done.
            </Text>
          </Text>
          <Text className="text-base leading-6 max-w-xs font-jakarta" style={{ color: COLORS.textSecondary }}>
            From errands to professional help, post a task and connect
            with trusted people ready to help — fast.
          </Text>
        </View>

        {/* ── Steps ── */}
        <View className="mb-10">
          <Step index={1} text="Describe the task you need done" />
          <Step index={2} text="Receive offers from nearby helpers" />
          <Step index={3} text="Select the best fit and relax" />
        </View>

        {/* ── Auth card ── */}
        <View
          className="rounded-[28px] overflow-hidden"
          style={{ borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card }}
        >
          <LinearGradient
            colors={[COLORS.surface, COLORS.surfaceMuted]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ paddingHorizontal: 24, paddingVertical: 28 }}
          >
            {/* top rule with label */}
            <View className="flex-row items-center gap-3">
              <View className="flex-1 h-px" style={{ backgroundColor: COLORS.border }} />
              <Text className="text-xs font-semibold tracking-wide font-jakarta-semibold" style={{ color: COLORS.textMuted }}>Sign in to continue</Text>
              <View className="flex-1 h-px" style={{ backgroundColor: COLORS.border }} />
            </View>

            <View className="mt-5">
              <OAuth />
            </View>
          </LinearGradient>
        </View>

        {/* ── Spacer ── */}
        <View className="flex-1" />

        {/* ── Footer ── */}
        <View className="items-center pb-5 pt-4">
          <View className="flex-row items-center gap-2 mb-1.5">
            <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary, opacity: 0.5 }} />
            <Text className="text-xs tracking-wide font-jakarta" style={{ color: COLORS.textMuted }}>
              Built for people who value speed and reliability
            </Text>
          </View>
        </View>

      </View>
    </SafeAreaView>
  )
}

export default SignIn