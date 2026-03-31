"use client"

import { IMAGES } from "@/constants"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Location from "expo-location"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { useSocket } from "@/contexts/SocketContext"
import { getApiUrl } from "@/lib/fetch"
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
  Platform,
} from "react-native"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.415

// ─── Data ──────────────────────────────────────────────────────────────────────
const serviceProviders = [
  {
    id: 1,
    title: "Plumber",
    providerCount: 1284,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=500&fit=crop&crop=faces",
    accentColor: "#dbeafe",
  },
  {
    id: 2,
    title: "Electrician",
    providerCount: 967,
    image: "https://images.unsplash.com/photo-1682345262055-8f95f3c513ea?q=80&w=1170&auto=format&fit=crop?w=400&h=500&fit=crop&crop=faces",
    accentColor: "#fef9c3",
  },
  {
    id: 3,
    title: "Carpenter",
    providerCount: 543,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=500&fit=crop&crop=faces",
    accentColor: "#dcfce7",
  },
  {
    id: 4,
    title: "Painter",
    providerCount: 412,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=500&fit=crop&crop=faces",
    accentColor: "#fce7f3",
  },
]

const popularSearches = ["Plumber", "Electrician", "Cleaning", "Painting", "Moving help"]

// ─── Component ─────────────────────────────────────────────────────────────────
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
  const [activeSearch, setActiveSearch] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) router.replace("/")
    else setCheckingAuth(false)
  }, [isLoaded, isSignedIn])

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") { setLocationLoading(false); return }
        const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const [result] = await Location.reverseGeocodeAsync({
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
        })
        setCity(result?.city || result?.district || result?.subregion || null)
      } catch { setCity(null) }
      finally { setLocationLoading(false) }
    }
    fetchLocation()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    setActiveSearch(query || null)
    if (!query.trim()) { setSearchResults([]); setIsSearching(false); return }
    setIsSearching(true)
    try {
      const res = await fetch(getApiUrl(`/api/jobs/search?q=${encodeURIComponent(query)}`))
      const data = await res.json()
      setSearchResults(data.success && Array.isArray(data.data) ? data.data : [])
    } catch { setSearchResults([]) }
    finally { setIsSearching(false) }
  }

  const locationLabel = locationLoading ? "Detecting location…" : city ?? "Location unavailable"
  const locationDetected = !locationLoading && !!city

  if (checkingAuth) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f8f8f6]">
        <Text style={{ color: "#9ca3af", fontFamily: "DMSans-Regular" }}>Checking session...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f6" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View
          style={{
            flexDirection:    "row",
            alignItems:       "center",
            justifyContent:   "space-between",
            paddingHorizontal: 20,
            paddingTop:        20,
            paddingBottom:     16,
            backgroundColor:   "#ffffff",
          }}
        >
          {/* Avatar */}
          <Image
            source={{
              uri: user?.imageUrl ||
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
            }}
            style={{ width: 46, height: 46, borderRadius: 23 }}
          />

          {/* Greeting */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 11, color: "#9ca3af", letterSpacing: 0.2, fontFamily: "DMSans-Regular" }}>
              Good day,
            </Text>
            <Text style={{ fontSize: 17, fontWeight: "600", color: "#0f1f14", marginTop: 1, fontFamily: "DMSans-SemiBold" }}>
              {user?.fullName || "User"}
            </Text>
            {/* Location row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
              <View
                style={{
                  width: 5, height: 5, borderRadius: 2.5,
                  backgroundColor: locationDetected ? "#16a34a" : "#d1d5db",
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: locationDetected ? "#16a34a" : "#9ca3af",
                  fontWeight: "500",
                  fontFamily: "DMSans-Medium",
                }}
              >
                {locationLabel}
              </Text>
            </View>
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            onPress={() => router.push("/(root)/notifications")}
            style={{
              width:           40,
              height:          40,
              borderRadius:    14,
              backgroundColor: "#f4f4f2",
              alignItems:      "center",
              justifyContent:  "center",
            }}
          >
            <Ionicons name="notifications-outline" size={20} color="#374151" />
            {unreadCount > 0 && (
              <View
                style={{
                  position:        "absolute",
                  top:              7,
                  right:            7,
                  width:            8,
                  height:           8,
                  borderRadius:     4,
                  backgroundColor:  "#ef4444",
                  borderWidth:      1.5,
                  borderColor:      "#ffffff",
                }}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Hero + Search ── */}
        <View
          style={{
            backgroundColor:  "#ffffff",
            paddingHorizontal: 20,
            paddingBottom:     18,
            borderBottomWidth:  0.5,
            borderBottomColor: "#f0f0ee",
          }}
        >
          {/* Eyebrow */}
          <Text
            style={{
              fontSize:      11,
              fontWeight:    "500",
              letterSpacing: 3,
              textTransform: "uppercase",
              color:         "#16a34a",
              marginBottom:   6,
              fontFamily:    "DMSans-Medium",
            }}
          >
            QuickHands Now
          </Text>

          {/* Editorial headline */}
          <Text
            style={{
              fontSize:      26,
              color:         "#0f1f14",
              lineHeight:    31,
              letterSpacing: -0.5,
              marginBottom:  18,
              fontFamily:    "DMSerifDisplay-Regular",
            }}
          >
            {"Find "}
            <Text style={{ fontFamily: "DMSerifDisplay-Italic", color: "#16a34a" }}>specialists</Text>
            {"\nnear you."}
          </Text>

          {/* Search input */}
          <View
            style={{
              flexDirection:    "row",
              alignItems:       "center",
              backgroundColor:  "#f8f8f6",
              borderRadius:     14,
              borderWidth:      0.5,
              borderColor:      "#e5e7eb",
              paddingHorizontal: 14,
              paddingVertical:   11,
              gap:               10,
            }}
          >
            <Ionicons name="search-outline" size={18} color="#9ca3af" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search for a specialist or service"
              placeholderTextColor="#9ca3af"
              style={{ flex: 1, fontSize: 13, color: "#374151", fontFamily: "DMSans-Regular" }}
            />
            {isSearching && (
              <Text style={{ fontSize: 10, color: "#9ca3af" }}>Searching…</Text>
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={18} color="#d1d5db" />
              </TouchableOpacity>
            )}
          </View>

          {/* Pill chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, paddingTop: 12 }}
          >
            {popularSearches.map((term) => {
              const isActive = activeSearch === term
              return (
                <TouchableOpacity
                  key={term}
                  activeOpacity={0.8}
                  onPress={() => handleSearch(term)}
                  style={{
                    paddingHorizontal: 13,
                    paddingVertical:    6,
                    borderRadius:       99,
                    backgroundColor:   isActive ? "#dcfce7" : "#f4f4f2",
                    borderWidth:        0.5,
                    borderColor:       isActive ? "#86efac" : "#e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      fontSize:   11.5,
                      fontWeight: "500",
                      color:      isActive ? "#15803d" : "#374151",
                      fontFamily: "DMSans-Medium",
                    }}
                  >
                    {term}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Search results */}
          {searchQuery.length > 0 && searchResults.length > 0 && (
            <View style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: "#0f1f14", marginBottom: 8, fontFamily: "DMSans-SemiBold" }}>
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
              </Text>
              {searchResults.map((job: any) => (
                <View
                  key={job.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderWidth:      0.5,
                    borderColor:     "#efefed",
                    borderRadius:    14,
                    padding:          12,
                    marginBottom:      8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f1f14", fontFamily: "DMSans-SemiBold" }}>
                    {job.serviceType}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, fontFamily: "DMSans-Regular" }}>
                    Budget: ${job.maxPrice} · {job.specialistChoice || "Any specialist"}
                  </Text>
                  {job.additionalInfo && (
                    <Text numberOfLines={2} style={{ fontSize: 11, color: "#6b7280", marginTop: 3, fontFamily: "DMSans-Regular" }}>
                      {job.additionalInfo}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {searchQuery.length > 0 && !isSearching && searchResults.length === 0 && (
            <View style={{ marginTop: 12, padding: 16, backgroundColor: "#f8f8f6", borderRadius: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 13, color: "#9ca3af", fontFamily: "DMSans-Regular" }}>
                {`No jobs found for "${searchQuery}"`}
              </Text>
            </View>
          )}
        </View>

        {/* ── Popular Services ── */}
        <View
          style={{
            backgroundColor:  "#ffffff",
            paddingTop:        20,
            paddingBottom:      8,
            borderBottomWidth:  0.5,
            borderBottomColor: "#f0f0ee",
          }}
        >
          <View
            style={{
              flexDirection:    "row",
              justifyContent:   "space-between",
              alignItems:       "baseline",
              paddingHorizontal: 20,
              marginBottom:      14,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f1f14", fontFamily: "DMSans-SemiBold" }}>
              Popular Services
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: 12, color: "#16a34a", fontWeight: "500", fontFamily: "DMSans-Medium" }}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 4 }}
          >
            {serviceProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                activeOpacity={0.92}
                style={{
                  width:           CARD_WIDTH,
                  borderRadius:    18,
                  overflow:        "hidden",
                  backgroundColor: "#ffffff",
                  borderWidth:      0.5,
                  borderColor:     "#f0f0ee",
                }}
              >
                {/* Image area with accent bg */}
                <View style={{ height: 170, backgroundColor: provider.accentColor }}>
                  <Image
                    source={{ uri: provider.image }}
                    style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                  />
                  {/* Provider count chip */}
                  <View
                    style={{
                      position:         "absolute",
                      top:               10,
                      left:              10,
                      flexDirection:     "row",
                      alignItems:        "center",
                      gap:               5,
                      backgroundColor:   "rgba(255,255,255,0.92)",
                      borderRadius:       99,
                      paddingHorizontal: 9,
                      paddingVertical:    4,
                    }}
                  >
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#16a34a" }} />
                    <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#374151", fontFamily: "DMSans-SemiBold" }}>
                      {provider.providerCount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Card footer */}
                <View style={{ padding: 12, backgroundColor: "#ffffff" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#0f1f14", fontFamily: "DMSans-SemiBold" }}>
                    {provider.title}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 2, fontFamily: "DMSans-Regular" }}>
                    {provider.providerCount} providers available
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── How it works ── */}
        <View
          style={{
            backgroundColor:  "#ffffff",
            padding:           20,
            borderBottomWidth:  0.5,
            borderBottomColor: "#f0f0ee",
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0f1f14", marginBottom: 14, fontFamily: "DMSans-SemiBold" }}>
            How it works
          </Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Step 1 */}
            <View
              style={{
                flex:            1,
                backgroundColor: "#f8f8f6",
                borderRadius:    16,
                padding:          14,
                borderWidth:      0.5,
                borderColor:     "#efefed",
              }}
            >
              <View
                style={{
                  width:           36,
                  height:          36,
                  borderRadius:    11,
                  backgroundColor: "#eff6ff",
                  alignItems:      "center",
                  justifyContent:  "center",
                  marginBottom:    10,
                }}
              >
                <Ionicons name="search" size={18} color="#2563eb" />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#0f1f14", fontFamily: "DMSans-SemiBold" }}>
                Find a Pro
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, lineHeight: 16, fontFamily: "DMSans-Regular" }}>
                Search verified professionals
              </Text>
            </View>

            {/* Step 2 */}
            <View
              style={{
                flex:            1,
                backgroundColor: "#f8f8f6",
                borderRadius:    16,
                padding:          14,
                borderWidth:      0.5,
                borderColor:     "#efefed",
              }}
            >
              <View
                style={{
                  width:           36,
                  height:          36,
                  borderRadius:    11,
                  backgroundColor: "#fffbeb",
                  alignItems:      "center",
                  justifyContent:  "center",
                  marginBottom:    10,
                }}
              >
                <Ionicons name="star" size={18} color="#d97706" />
              </View>
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#0f1f14", fontFamily: "DMSans-SemiBold" }}>
                Read Reviews
              </Text>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 3, lineHeight: 16, fontFamily: "DMSans-Regular" }}>
                Real ratings from customers
              </Text>
            </View>
          </View>
        </View>

        {/* ── Utility cards ── */}
        <View style={{ padding: 16, paddingTop: 16 }}>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            {/* Feedback */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                flex:            1,
                backgroundColor: "#ffffff",
                borderRadius:    16,
                padding:          14,
                borderWidth:      0.5,
                borderColor:     "#efefed",
                minHeight:        90,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#0f1f14", lineHeight: 18, fontFamily: "DMSans-SemiBold" }}>
                How do you like the app?
              </Text>
              <View style={{ alignItems: "flex-end", marginTop: "auto", paddingTop: 10 }}>
                <Ionicons name="clipboard-outline" size={28} color="#d1d5db" />
              </View>
            </TouchableOpacity>

            {/* Support */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                flex:            1,
                backgroundColor: "#ffffff",
                borderRadius:    16,
                padding:          14,
                borderWidth:      0.5,
                borderColor:     "#efefed",
                minHeight:        90,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: "600", color: "#0f1f14", lineHeight: 18, fontFamily: "DMSans-SemiBold" }}>
                Contact Support
              </Text>
              <View style={{ alignItems: "flex-end", marginTop: "auto", paddingTop: 10 }}>
                <Ionicons name="mail-outline" size={28} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Specialist CTA */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={{
              flexDirection:   "row",
              alignItems:      "center",
              justifyContent:  "space-between",
              backgroundColor: "#ffffff",
              borderRadius:    16,
              padding:          16,
              borderWidth:      0.5,
              borderColor:     "#efefed",
              gap:              12,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0f1f14", fontFamily: "DMSans-SemiBold" }}>
                Are you a specialist?
              </Text>
              <Text style={{ fontSize: 11.5, color: "#9ca3af", marginTop: 3, lineHeight: 17, fontFamily: "DMSans-Regular" }}>
                Find clients and earn with QuickHands
              </Text>
            </View>
            {/* Arrow badge */}
            <View
              style={{
                width:           34,
                height:          34,
                borderRadius:    11,
                backgroundColor: "#f4f4f2",
                alignItems:      "center",
                justifyContent:  "center",
              }}
            >
              <Ionicons name="arrow-forward" size={16} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Bottom CTA ── */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop:         14,
          paddingBottom:      Platform.OS === "ios" ? 20 : 16,
          backgroundColor:   "#ffffff",
          borderTopWidth:     0.5,
          borderTopColor:    "#f0f0ee",
        }}
      >
        <TouchableOpacity
          onPress={() => router.push("/(root)/service")}
          activeOpacity={0.88}
          style={{
            backgroundColor: "#0f1f14",
            borderRadius:    16,
            paddingVertical: 15,
            alignItems:      "center",
            ...Platform.select({
              ios: {
                shadowColor:   "#0f1f14",
                shadowOffset:  { width: 0, height: 4 },
                shadowOpacity: 0.22,
                shadowRadius:  10,
              },
              android: { elevation: 5 },
            }),
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "600", fontFamily: "DMSans-SemiBold", letterSpacing: 0.1 }}>
            Post Your Task
          </Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  )
}

export default HomeScreen
