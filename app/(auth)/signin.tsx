"use client"

import { useEffect } from "react"
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
} from "react-native"
import { useUser } from "@clerk/clerk-expo"
import { router } from "expo-router"
import OAuth from "@/components/OAuth"

// ─── Step component ───────────────────────────────────────────────
const Step = ({ index, text }: { index: number; text: string }) => {
  const isLast = index === 3
  return (
    <View className="flex-row">
      {/* left column: number + connector line */}
      <View className="items-center w-9 mr-4">
        <View className="w-8 h-8 rounded-full bg-green-700 items-center justify-center shadow-sm">
          <Text className="text-xs font-bold text-white font-jakarta-bold">{index}</Text>
        </View>
        {!isLast && <View className="w-px flex-1 bg-gray-200 mt-1 min-h-5" />}
      </View>

      {/* right column: text */}
      <View className="flex-1 pb-6 justify-center">
        <Text className="text-sm text-gray-500 leading-relaxed tracking-wide font-jakarta">{text}</Text>
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
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <View className="items-center">
          <View className="w-14 h-14 rounded-2xl bg-green-700 items-center justify-center shadow-lg">
            <Text className="text-3xl font-black text-green-900 leading-9 font-jakarta-bold">Q</Text>
          </View>
          <ActivityIndicator size="small" color="#15803d" style={{ marginTop: 24 }} />
          <Text className="mt-3 text-sm text-gray-400 tracking-wide font-jakarta">Preparing your workspace…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (user) return null

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-7 pt-4">

        {/* ── Logo mark ── */}
        <View className="flex-row items-center gap-3 mb-11">
          <View className="w-11 h-11 rounded-xl bg-green-700 items-center justify-center shadow-md">
            <Text className="text-2xl font-black text-green-900 leading-8 font-jakarta-bold">Q</Text>
          </View>
          <View className="gap-1">
            <Text className="text-base font-extrabold text-gray-900 tracking-tight font-jakarta-bold">QuickHands</Text>
          </View>
        </View>

        {/* ── Hero ── */}
        <View className="mb-10">
          <Text className="text-4xl font-extrabold text-gray-900 leading-tight tracking-tighter mb-3.5 font-jakarta-bold">
            Post a task.{"\n"}
            <Text className="text-green-700">Get it done.</Text>
          </Text>
          <Text className="text-base text-gray-500 leading-6 max-w-xs font-jakarta">
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
        <View className="bg-gray-50 rounded-3xl px-6 py-7 border border-gray-100 shadow-sm">
          {/* top rule with label */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1 h-px bg-gray-100" />
            <Text className="text-xs font-semibold text-gray-400 tracking-wide font-jakarta-semibold">Sign in to continue</Text>
            <View className="flex-1 h-px bg-gray-100" />
          </View>

          <View className="mt-5">
            <OAuth />
          </View>
        </View>

        {/* ── Spacer ── */}
        <View className="flex-1" />

        {/* ── Footer ── */}
        <View className="items-center pb-5 pt-4">
          <Text className="text-xs text-gray-400 tracking-wide font-jakarta">
            Built for people who value speed and reliability
          </Text>
        </View>

      </View>
    </SafeAreaView>
  )
}

export default SignIn