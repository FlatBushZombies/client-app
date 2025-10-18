"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  SafeAreaView,
} from "react-native"
import { useUser, useAuth } from "@clerk/clerk-expo"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { UserIcon, BoltIcon, WrenchIcon } from "lucide-react-native"
import { router } from "expo-router"
import { IMAGES } from "@/constants"

const HomeScreen = () => {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check Clerk session and redirect unauthenticated users
  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.replace("/") // redirect to landing screen
    } else {
      setCheckingAuth(false)
    }
  }, [isLoaded, isSignedIn])

  if (checkingAuth) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500 text-base">Checking session...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row items-center">
            <Image
              source={{ uri: user?.imageUrl || "https://placehold.co/100x100" }}
              className="w-10 h-10 rounded-full mr-3"
            />
            <View>
              <Text className="text-gray-500 text-sm">Hello 👋</Text>
              <Text className="text-gray-900 text-lg font-bold">
                {user?.fullName || "User"}
              </Text>
            </View>
          </View>
          <TouchableOpacity className="relative">
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="px-4 py-3 bg-white border-b border-gray-200">
          <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search specialists"
              className="flex-1 ml-3 text-gray-700 text-base"
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity className="bg-sky-500 rounded-lg p-2 ml-2">
              <MaterialIcons name="tune" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Illustration */}
        <Image
          source={IMAGES.provider}
          className="w-full h-64"
          resizeMode="cover"
        />

        {/* Heading */}
        <View className="px-4 mt-6">
          <Text className="text-xl font-semibold text-gray-800">
            People often look for
          </Text>
        </View>

        {/* Cards */}
        <View className="flex-row justify-between px-4 mt-4 mb-8">
          {/* Plumber Card */}
          <TouchableOpacity className="flex-1 mr-2 bg-white rounded-2xl shadow p-4 items-center">
            <WrenchIcon size={32} color="#2563eb" />
            <Text className="mt-2 text-lg font-medium text-gray-700">Plumber</Text>
            <View className="flex-row items-center mt-1">
              <UserIcon size={16} color="#6b7280" />
              <Text className="ml-1 text-sm text-gray-600">128 providers</Text>
            </View>
          </TouchableOpacity>

          {/* Electrician Card */}
          <TouchableOpacity className="flex-1 ml-2 bg-white rounded-2xl shadow p-4 items-center">
            <BoltIcon size={32} color="#f59e0b" />
            <Text className="mt-2 text-lg font-medium text-gray-700">Electrician</Text>
            <View className="flex-row items-center mt-1">
              <UserIcon size={16} color="#6b7280" />
              <Text className="ml-1 text-sm text-gray-600">96 providers</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default HomeScreen
