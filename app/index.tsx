"use client"

import { useEffect } from "react"
import { Text, View, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { router } from "expo-router"
import { useAuth } from "@clerk/clerk-expo"
import { IMAGES } from "@/constants"

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/(root)/home")
    }
  }, [isLoaded, isSignedIn])

  const handleGetStarted = () => {
    // Route based on session state
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
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    )
  }

  // If already signed in, show loading while redirecting
  if (isSignedIn) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-gray-500 font-quicksand-medium mt-4">
          Redirecting...
        </Text>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-white">
      {/* Top decorative gradient bar */}
      <View className="h-1 bg-emerald-500" />
      
      {/* Content Container */}
      <View className="flex-1 px-8 pt-16 pb-8">
        
        {/* Logo and Text Section */}
        <View className="flex-1 justify-center items-center">
          {/* Logo */}
          <View className="mb-8 items-center">
            <View 
              className="rounded-3xl"
              style={{
                shadowColor: "#111827",
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 15,
              }}
            >
              <Image
                source={IMAGES.logo}
                className="w-28 h-28 rounded-3xl"
                resizeMode="contain"
              />
            </View>
            {/* Brand name under logo */}
            <Text className="text-emerald-600 font-quicksand-semibold text-lg mt-4 tracking-widest uppercase">
              QuickHands
            </Text>
          </View>

          {/* Decorative line */}
          <View className="w-16 h-1 bg-emerald-500 rounded-full mb-8" />

          {/* Title */}
          <Text className="text-4xl font-quicksand-bold text-gray-900 text-center leading-tight px-2 tracking-tight">
            Find specialists to help with your task
          </Text>

          {/* Subtitle */}
          <Text className="text-base font-quicksand-medium text-gray-500 text-center mt-5 px-6 leading-relaxed">
            Connect with top-tier specialists to get the job done.
          </Text>
        </View>

        {/* Buttons Container */}
        <View className="w-full items-center pb-4">
          {/* Primary Button - Service Provider */}
          <TouchableOpacity
            className="bg-gray-900 rounded-2xl w-full items-center overflow-hidden"
            onPress={handleGetStarted}
            activeOpacity={0.9}
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.15,
              shadowRadius: 24,
              elevation: 12,
            }}
          >
            {/* Inner border effect */}
            <View className="w-full py-5 px-8 border-2 border-white/20 rounded-2xl items-center flex-row justify-center">
              <Text className="text-white font-quicksand-semibold text-lg tracking-wide">
                {isSignedIn ? "Go to Dashboard" : "I want to look for services"}
              </Text>
              <Text className="text-white ml-3 text-lg">→</Text>
            </View>
          </TouchableOpacity>

          {/* Secondary Button - Service Seeker */}
          <TouchableOpacity 
            className="py-5 px-8 mt-6" 
            onPress={handleBrowseServices}
            activeOpacity={0.7}
          >
            <View className="items-center">
              <Text className="text-gray-600 font-quicksand-medium text-base">
                i want to offer services
              </Text>
              <View className="w-full h-px bg-gray-300 mt-2" />
            </View>
          </TouchableOpacity>

          {/* Trust indicator */}
          <View className="flex-row items-center mt-8">
            <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
            <Text className="text-gray-400 font-quicksand-medium text-xs tracking-wide">
              Access top-tier specialists
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}