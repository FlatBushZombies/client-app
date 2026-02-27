"use client"

import { IMAGES } from "@/constants"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Location from "expo-location"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/SocketContext"
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.42

const serviceProviders = [
  {
    id: 1,
    title: "Plumber",
    providerCount: 1284,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#E8F4FD", "#B8D4E8"],
  },
  {
    id: 2,
    title: "Electrician",
    providerCount: 967,
    image: "https://images.unsplash.com/photo-1682345262055-8f95f3c513ea?q=80&w=1170&auto=format&fit=crop?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#FEF3C7", "#FCD34D"],
  },
  {
    id: 3,
    title: "Carpenter",
    providerCount: 543,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#D1FAE5", "#6EE7B7"],
  },
  {
    id: 4,
    title: "Painter",
    providerCount: 412,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#FCE7F3", "#F9A8D4"],
  },
]

const popularSearches = ["Plumber", "Electrician", "Cleaning", "Painting", "Moving help"]

const HomeScreen = () => {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const { unreadCount } = useSocket()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [city, setCity] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      router.replace("/")
    } else {
      setCheckingAuth(false)
    }
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") {
          setCity(null)
          setLocationLoading(false)
          return
        }

        const coords = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })

        const [result] = await Location.reverseGeocodeAsync({
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
        })

        setCity(result?.city || result?.district || result?.subregion || null)
      } catch {
        setCity(null)
      } finally {
        setLocationLoading(false)
      }
    }

    fetchLocation()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `https://quickhands-api.vercel.app/api/jobs/search?q=${encodeURIComponent(query)}`
      )
      const data = await response.json()
      
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSearchTermClick = (term: string) => {
    handleSearch(term)
  }

  const locationLabel = locationLoading
    ? "Detecting location…"
    : city ?? "Location unavailable"

  const locationDetected = !locationLoading && !!city

  if (checkingAuth) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500 text-base font-jakarta">Checking session...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 py-4 bg-white">
          <View className="flex-row items-center">
            <Image
              source={{
                uri:
                  user?.imageUrl ||
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
              }}
              className="w-12 h-12 rounded-full mr-3"
            />
            <View>
              <Text className="text-gray-400 text-xs font-jakarta">Good day,</Text>
              <Text className="text-gray-900 text-lg font-bold font-jakarta-bold">
                {user?.fullName || "User"}
              </Text>
              <View className="flex-row items-center mt-1.5">
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={locationDetected ? "#15803d" : "#9CA3AF"}
                />
                <Text className={`ml-1 text-xs font-jakarta ${locationDetected ? "text-green-700" : "text-gray-500"}`}>
                  {locationLabel}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(root)/notifications")}
            className="bg-gray-100 rounded-xl p-2.5"
          >
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            {unreadCount > 0 && (
              <View className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full items-center justify-center px-1">
                <Text className="text-white text-[10px] font-bold font-jakarta-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <View className="px-5 py-4 bg-white">
          <View className="flex-row items-center bg-gray-50 rounded-2xl px-4 py-3.5 border border-gray-200">
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search for a specialist or service"
              className="flex-1 ml-3 text-gray-700 text-base font-jakarta"
              placeholderTextColor="#9CA3AF"
            />
            {isSearching && (
              <View className="ml-2">
                <Text className="text-xs text-gray-500">Searching...</Text>
              </View>
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} className="ml-2">
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12 }}
          >
            {popularSearches.map((term) => (
              <TouchableOpacity
                key={term}
                activeOpacity={0.8}
                onPress={() => handleSearchTermClick(term)}
                className="px-3.5 py-2 rounded-full bg-gray-100 border border-gray-200 mr-2"
              >
                <Text className="text-xs text-gray-600 font-medium font-jakarta-medium">{term}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Search Results */}
          {searchQuery.length > 0 && searchResults.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-semibold text-gray-900 mb-2 font-jakarta-semibold">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </Text>
              <ScrollView className="max-h-60">
                {searchResults.map((job: any) => (
                  <View
                    key={job.id}
                    className="bg-white border border-gray-200 rounded-xl p-3 mb-2"
                  >
                    <Text className="text-sm font-semibold text-gray-900 font-jakarta-semibold">
                      {job.serviceType}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1 font-jakarta">
                      Budget: ${job.maxPrice} | {job.specialistChoice || 'Any specialist'}
                    </Text>
                    {job.additionalInfo && (
                      <Text className="text-xs text-gray-600 mt-1 font-jakarta" numberOfLines={2}>
                        {job.additionalInfo}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          {searchQuery.length > 0 && !isSearching && searchResults.length === 0 && (
            <View className="mt-4 p-4 bg-gray-50 rounded-xl">
              <Text className="text-sm text-gray-500 text-center font-jakarta">
                No jobs found for "{searchQuery}"
              </Text>
            </View>
          )}
        </View>

        {/* ── Main content block ── */}
        <View
          className="mt-6 mx-4 bg-white rounded-3xl pt-5 pb-6"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 }}
        >
          <View className="flex-row justify-between items-center px-4 mb-4">
            <Text className="text-xl font-bold text-gray-900 font-jakarta-bold">Popular Services</Text>
            <TouchableOpacity>
              <Text className="text-sm font-semibold text-sky-500 font-jakarta-semibold">View all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
          >
            {serviceProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                activeOpacity={0.9}
                style={{ width: CARD_WIDTH }}
                className="mx-1 rounded-[20px] overflow-hidden bg-white"
              >
                <LinearGradient
                  colors={[provider.bgColor[0], provider.bgColor[1]]}
                  style={{ height: 200, justifyContent: "flex-end" }}
                >
                  <View className="absolute top-3 left-3 flex-row items-center bg-white/90 px-2.5 py-1.5 rounded-full">
                    <Ionicons name="people" size={14} color="#374151" />
                    <Text className="ml-1 text-xs font-semibold text-gray-700 font-jakarta-semibold">
                      {provider.providerCount.toLocaleString()}
                    </Text>
                  </View>
                  <Image
                    source={{ uri: provider.image }}
                    style={{ width: "100%", height: 180, resizeMode: "cover" }}
                  />
                </LinearGradient>

                <View className="py-3.5 px-4 bg-white">
                  <Text className="text-base font-bold text-gray-900 font-jakarta-bold">{provider.title}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5 font-jakarta">
                    {provider.providerCount} providers available
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="h-px bg-gray-100 mt-5 mx-4" />

          <View className="mt-5 px-4">
            <Text className="text-lg font-bold text-gray-900 mb-3 font-jakarta-bold">How it works</Text>

            <View className="flex-row flex-wrap justify-between" style={{ rowGap: 12 }}>
              <View className="w-[48%] bg-gray-50 rounded-2xl p-3.5 border border-gray-200">
                <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mb-2.5">
                  <Ionicons name="search" size={20} color="#2563EB" />
                </View>
                <Text className="text-sm font-semibold text-gray-900 font-jakarta-semibold">Find a Pro</Text>
                <Text className="text-xs text-gray-500 mt-1 font-jakarta">Search verified professionals</Text>
              </View>

              <View className="w-[48%] bg-gray-50 rounded-2xl p-3.5 border border-gray-200">
                <View className="w-10 h-10 bg-amber-100 rounded-xl items-center justify-center mb-2.5">
                  <Ionicons name="star" size={20} color="#F59E0B" />
                </View>
                <Text className="text-sm font-semibold text-gray-900 font-jakarta-semibold">Read Reviews</Text>
                <Text className="text-xs text-gray-500 mt-1 font-jakarta">Real ratings from customers</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Feedback and Support ── */}
        <View className="mt-6 mx-4 mb-4">
          <View className="flex-row justify-between mb-3">
            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-1 bg-gray-50 rounded-2xl p-4 mr-1.5 border border-gray-200 min-h-[100px]"
            >
              <Text className="text-sm font-semibold text-gray-900 mb-2 leading-[18px] font-jakarta-semibold">
                How do you like the app?
              </Text>
              <View className="items-end mt-auto">
                <Ionicons name="clipboard-outline" size={32} color="#6B7280" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-1 bg-gray-50 rounded-2xl p-4 ml-1.5 border border-gray-200 min-h-[100px]"
            >
              <Text className="text-sm font-semibold text-gray-900 mb-2 leading-[18px] font-jakarta-semibold">
                Contact Support
              </Text>
              <View className="items-end mt-auto">
                <Ionicons name="mail-outline" size={32} color="#6B7280" />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex-row items-center justify-between"
          >
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 mb-1.5 font-jakarta-bold">
                Are you a specialist?
              </Text>
              <Text className="text-xs text-gray-500 leading-[18px] font-jakarta">
                Find clients and earn with QuickHands
              </Text>
            </View>
            <View className="ml-3 flex-row items-center">
              <Ionicons name="person-outline" size={24} color="#9CA3AF" style={{ marginLeft: -8 }} />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View className="px-5 py-4 bg-white border-t border-gray-200">
        <TouchableOpacity
          onPress={() => router.push("/(root)/service")}
          className="bg-gray-900 rounded-2xl py-4 items-center"
          style={{ shadowColor: "#111827", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
        >
          <Text className="text-white text-base font-bold font-jakarta-bold">Post Your Task</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default HomeScreen