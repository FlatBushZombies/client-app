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
        <View className="items-center gap-4">
          <ActivityIndicator size="large" />
          <Text className="text-sm text-gray-400">
            Preparing your workspace…
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (user) return null

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6">
        {/* Top Spacer */}
        <View className="h-8" />

        {/* Hero */}
        <View>
          <Text className="text-4xl font-quicksand-bold text-gray-900 leading-tight">
            Post a task.
            {"\n"}
            Get it done.
          </Text>

          <View className="h-4" />

          <Text className="text-base text-gray-500 leading-relaxed max-w-sm">
            From errands to professional help, post a task and connect
            with trusted people ready to help — fast.
          </Text>
        </View>

        {/* Hero → Steps Spacer */}
        <View className="h-10" />

        {/* Steps */}
        <View className="space-y-5">
          <Step index={1} text="Describe the task you need done" />
          <Step index={2} text="Receive offers from nearby helpers" />
          <Step index={3} text="Select the best fit and relax" />
        </View>

        {/* Steps → Auth Card Spacer */}
        <View className="h-14" />

        {/* Auth Card */}
        <View className="rounded-3xl bg-gray-50 px-6 py-10 border border-gray-100 shadow-sm">
          <Text className="mb-6 text-base font-medium text-gray-900 text-center">
            Sign in to continue
          </Text>

          <OAuth />
        </View>

        {/* Bottom Spacer */}
        <View className="flex-1" />

        {/* Footer */}
        <View className="items-center pb-6">
          <Text className="text-sm text-gray-400">
            Built for people who value speed and reliability
          </Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const Step = ({
  index,
  text,
}: {
  index: number
  text: string
}) => {
  return (
    <View className="flex-row items-center">
      <View className="h-8 w-8 rounded-full bg-black items-center justify-center mr-4">
        <Text className="text-xs font-semibold text-white">
          {index}
        </Text>
      </View>

      <Text className="text-sm text-gray-600 flex-1 leading-relaxed">
        {text}
      </Text>
    </View>
  )
}

export default SignIn
