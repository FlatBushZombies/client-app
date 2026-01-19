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

const SignIn = () => {
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (isLoaded && user) {
      router.replace("/(root)/home")
    }
  }, [isLoaded, user])

  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    )
  }

  if (user) return null

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 py-10">
        {/* Value Proposition */}
        <View className="mt-14">
          <Text className="text-4xl font-quicksand-bold text-gray-900 leading-tight">
            Post a task.
            {"\n"}Get it done.
          </Text>

          <Text className="mt-4 text-base text-gray-500 leading-relaxed max-w-sm">
            Need help with errands, deliveries, cleaning, or quick jobs?
            Post a task and connect with trusted people nearby.
          </Text>
        </View>

        {/* Visual Steps */}
        <View className="mt-8 space-y-3">
          <Step text="Describe what you need done" />
          <Step text="Get offers from available helpers" />
          <Step text="Choose and get it done fast" />
        </View>

        {/* Auth Card */}
        <View className="mt-12 rounded-3xl bg-gray-50 px-6 py-8 border border-gray-100 shadow-sm">
          <OAuth />

          <Text className="mt-6 text-xs text-gray-400 text-center leading-relaxed">
            Secure sign-in. No spam. No hidden fees.
          </Text>
        </View>

        {/* Footer Trust */}
        <View className="mt-auto items-center pt-8">
          <Text className="text-sm text-gray-400">
            Trusted by people who value their time
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const Step = ({ text }: { text: string }) => {
  return (
    <View className="flex-row items-center">
      <View className="h-2 w-2 rounded-full bg-black mr-3" />
      <Text className="text-sm text-gray-600">{text}</Text>
    </View>
  )
}

export default SignIn
