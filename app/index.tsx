"use client"

import { useEffect } from "react"
import { Text, View, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { IMAGES } from "@/constants"
import { ensureBackendUser } from "@/lib/userSync"
import { SPACING } from "@/constants/layout"
import { showErrorToast } from "@/lib/toast"
import { COLORS, GRADIENT } from "@/constants/theme"

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    const syncAndRoute = async () => {
      if (!isLoaded || !isSignedIn || !user) {
        return
      }

      try {
        await ensureBackendUser(user)
      } catch (error) {
        console.error("Failed to sync client user:", error)
        showErrorToast("Sync issue", "Your profile may be out of date — pull to refresh later.")
      }

      const completedOnboarding = user.unsafeMetadata?.completedOnboarding

      if (completedOnboarding) {
        router.replace("/(root)/home")
      } else {
        router.replace("/(auth)/onboarding")
      }
    }

    syncAndRoute().catch(() => undefined)
  }, [isLoaded, isSignedIn, user])

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
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Image
          source={IMAGES.logo}
          style={{ width: 64, height: 64, borderRadius: 18 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      </SafeAreaView>
    )
  }

  if (isSignedIn) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Image
          source={IMAGES.logo}
          style={{ width: 64, height: 64, borderRadius: 18 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        <Text className="mt-3 text-sm text-gray-400 tracking-wide font-jakarta">Redirecting…</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-white overflow-hidden">

      {/* ── decorative top corner rings ── */}
      <View className="absolute w-[300px] h-[300px] rounded-full border border-gray-200"
        style={{ top: -120, right: -100 }}
      />
      <View className="absolute w-[200px] h-[200px] rounded-full border border-gray-100"
        style={{ top: -60, right: -40 }}
      />

      <View
        className="flex-1 px-7"
        style={{
          paddingTop: SPACING.lg,
          paddingBottom: SPACING.xl,
        }}
      >

        {/* ── Centre: logo + headline ── */}
        <View className="flex-1 justify-center items-start">

          {/* logo */}
          <View
            className="rounded-3xl mb-6"
            style={{ shadowColor: "#0F172A", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 24, elevation: 8 }}
          >
            <Image
              source={IMAGES.logo}
              className="w-22 h-22 rounded-3xl"
              style={{ width: 88, height: 88, borderRadius: 24 }}
              resizeMode="contain"
            />
          </View>

          {/* wordmark */}
          <Text className="text-xs font-bold text-gray-400 tracking-[3px] uppercase mb-5 font-jakarta-bold">
            QuickHands
          </Text>

          {/* divider */}
          <View className="w-9 h-1 rounded-full mb-7" style={{ backgroundColor: COLORS.primary }} />

          {/* headline */}
          <Text className="text-[46px] font-extrabold text-gray-900 leading-[50px] tracking-tighter mb-5 font-jakarta-bold">
            Find{" "}
            <Text style={{ fontFamily: "DMSerifDisplay_400Regular_Italic", color: COLORS.primary, fontSize: 46 }}>
              specialists
            </Text>
            {"\nto help with\nyour task"}
          </Text>

          {/* subtitle */}
          <Text className="text-base text-gray-500 leading-7 tracking-wide font-jakarta max-w-[280px]">
            Connect with top-tier specialists to get the job done — fast, reliable, and nearby.
          </Text>
        </View>

        {/* ── Bottom: CTAs ── */}
        <View>

          {/* primary CTA */}
          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.88}
            style={{
              borderRadius: 20,
              overflow: "hidden",
              marginBottom: 16,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={GRADIENT.brand}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                minHeight: 64,
                paddingVertical: 20,
                paddingLeft: 24,
                paddingRight: 18,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: "700",
                  letterSpacing: 0.3,
                  fontFamily: "PlusJakartaSans_700Bold",
                }}
              >
                {isSignedIn ? "Continue to Home" : "I want to look for services"}
              </Text>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: 12,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16 }}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* secondary CTA */}
          <TouchableOpacity
            className="py-4 items-center border-[1.5px] border-gray-200 rounded-[20px] mb-7 bg-gray-50/60"
            onPress={handleBrowseServices}
            activeOpacity={0.65}
          >
            <Text className="text-sm font-semibold text-gray-500 tracking-wide font-jakarta-semibold">
              I want to offer services
            </Text>
          </TouchableOpacity>

          {/* trust indicator */}
          <View className="flex-row items-center justify-center gap-2">
            <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary, opacity: 0.5 }} />
            <Text className="text-xs text-gray-400 tracking-wide font-jakarta">
              Access top-tier specialists
            </Text>
          </View>

        </View>
      </View>
    </SafeAreaView>
  )
}
