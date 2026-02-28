"use client"

import { useEffect } from "react"
import { Text, View, TouchableOpacity, ActivityIndicator, Image, Platform } from "react-native"
import { router } from "expo-router"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { IMAGES } from "@/constants"

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // Check if user has completed onboarding
      const completedOnboarding = user.unsafeMetadata?.completedOnboarding
      
      if (completedOnboarding) {
        router.replace("/(root)/home")
      } else {
        router.replace("/(auth)/onboarding")
      }
    }
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
      <View className="flex-1 bg-white items-center justify-center">
        <View className="w-14 h-14 rounded-2xl bg-green-700 items-center justify-center shadow-lg">
          <Text className="text-3xl font-black text-green-900 leading-9 font-jakarta-bold">Q</Text>
        </View>
        <ActivityIndicator size="small" color="#15803d" style={{ marginTop: 24 }} />
      </View>
    )
  }

  if (isSignedIn) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <View className="w-14 h-14 rounded-2xl bg-green-700 items-center justify-center shadow-lg">
          <Text className="text-3xl font-black text-green-900 leading-9 font-jakarta-bold">Q</Text>
        </View>
        <ActivityIndicator size="small" color="#15803d" style={{ marginTop: 24 }} />
        <Text className="mt-3 text-sm text-gray-400 tracking-wide font-jakarta">Redirecting…</Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white overflow-hidden">

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
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingBottom: Platform.OS === "ios" ? 40 : 24,
        }}
      >

        {/* ── Centre: logo + headline ── */}
        <View className="flex-1 justify-center items-start">

          {/* logo */}
          <View className="rounded-3xl mb-5 shadow-lg">
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
          <View className="w-8 h-0.5 rounded-sm bg-green-700 mb-6" />

          {/* headline */}
          <Text className="text-[42px] font-extrabold text-gray-900 leading-[52px] tracking-tighter mb-4 font-jakarta-bold">
            Find specialists{"\n"}to help with{"\n"}your task
          </Text>

          {/* subtitle */}
          <Text className="text-base text-gray-500 leading-6 tracking-wide font-jakarta">
            Connect with top-tier specialists{"\n"}to get the job done.
          </Text>
        </View>

        {/* ── Bottom: CTAs ── */}
        <View>

          {/* primary CTA */}
          <TouchableOpacity
            className="bg-green-700 rounded-[18px] py-[18px] pl-6 pr-[18px] flex-row items-center justify-between mb-4 shadow-lg"
            onPress={handleGetStarted}
            activeOpacity={0.88}
          >
            <Text className="text-white text-sm font-bold tracking-wide flex-1 font-jakarta-bold">
              {isSignedIn ? "Continue to Home" : "I want to look for services"}
            </Text>
            <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center ml-3">
              <Text className="text-white text-base">→</Text>
            </View>
          </TouchableOpacity>

          {/* secondary CTA */}
          <TouchableOpacity
            className="py-4 items-center border-[1.5px] border-gray-200 rounded-[18px] mb-6"
            onPress={handleBrowseServices}
            activeOpacity={0.65}
          >
            <Text className="text-sm font-semibold text-gray-500 tracking-wide font-jakarta-semibold">
              I want to offer services
            </Text>
          </TouchableOpacity>

          {/* trust indicator */}
          <View className="flex-row items-center justify-center gap-2">
            <View className="w-1.5 h-1.5 rounded-full bg-green-700 opacity-40" />
            <Text className="text-xs text-gray-400 tracking-wide font-jakarta">
              Access top-tier specialists
            </Text>
          </View>

        </View>
      </View>
    </View>
  )
}