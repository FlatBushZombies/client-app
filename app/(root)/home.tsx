"use client"

import { IMAGES } from "@/constants"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Location from "expo-location"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import { NOTIFICATIONS_SUSPENDED, useSocket } from "@/contexts/SocketContext"
import { getApiUrl } from "@/lib/fetch"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout"
import { COLORS, SHADOW, GRADIENT } from "@/constants/theme"
import PostJobModal from "@/components/PostJobModal"
import { showErrorToast } from "@/lib/toast"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.415

// ─── Data ──────────────────────────────────────────────────────────────────────
const serviceProviders = [
  {
    id: 1,
    title: "Plumber",
    providerCount: 1284,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=500&fit=crop&crop=faces",
    accentColor: COLORS.accentGreenSoft,
  },
  {
    id: 2,
    title: "Electrician",
    providerCount: 967,
    image: "https://images.unsplash.com/photo-1682345262055-8f95f3c513ea?q=80&w=1170&auto=format&fit=crop?w=400&h=500&fit=crop&crop=faces",
    accentColor: COLORS.accentAmberSoft,
  },
  {
    id: 3,
    title: "Carpenter",
    providerCount: 543,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=500&fit=crop&crop=faces",
    accentColor: COLORS.accentPurpleSoft,
  },
  {
    id: 4,
    title: "Painter",
    providerCount: 412,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=500&fit=crop&crop=faces",
    accentColor: COLORS.accentGreenSoft,
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
  const [postJobVisible, setPostJobVisible] = useState(false)

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
    } catch {
      showErrorToast("Search failed", "Please try again.")
      setSearchResults([])
    }
    finally { setIsSearching(false) }
  }

  const locationLabel = locationLoading ? "Detecting location…" : city ?? "Location unavailable"
  const locationDetected = !locationLoading && !!city

  const unreadBadgeLabel = unreadCount > 99 ? "99+" : unreadCount.toString()

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: SPACING.sm, color: COLORS.textSecondary, fontFamily: "DMSans_400Regular" }}>Checking session...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 88 }}>

        {/* ── Header ── */}
        <View
          style={{
            flexDirection:    "row",
            alignItems:       "center",
            justifyContent:   "space-between",
            paddingHorizontal: 20,
            paddingTop:        20,
            paddingBottom:     18,
            backgroundColor:   COLORS.surface,
            borderBottomLeftRadius:  RADIUS.xl,
            borderBottomRightRadius: RADIUS.xl,
            ...SHADOW.card,
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width:           50,
              height:          50,
              borderRadius:    25,
              borderWidth:     2,
              borderColor:     COLORS.primarySoft,
              backgroundColor: COLORS.surface,
              alignItems:      "center",
              justifyContent:  "center",
              ...SHADOW.card,
            }}
          >
            <Image
              source={{
                uri: user?.imageUrl ||
                  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces",
              }}
              style={{ width: 46, height: 46, borderRadius: 23 }}
            />
          </View>

          {/* Greeting */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 11, color: COLORS.textSecondary, letterSpacing: 0.2, fontFamily: "DMSans_400Regular" }}>
              Good day,
            </Text>
            <Text style={{ fontSize: 18, fontWeight: "600", color: COLORS.textPrimary, marginTop: 1, fontFamily: "DMSans_600SemiBold" }}>
              {user?.fullName || "User"}
            </Text>
            {/* Location row */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}>
              <View
                style={{
                  width: 5, height: 5, borderRadius: 2.5,
                  backgroundColor: locationDetected ? COLORS.primary : COLORS.textMuted,
                }}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: locationDetected ? COLORS.primary : COLORS.textSecondary,
                  fontWeight: "500",
                  fontFamily: "DMSans_500Medium",
                }}
              >
                {locationLabel}
              </Text>
            </View>
          </View>

          {/* Notification bell — hidden while notifications are suspended,
              see NOTIFICATIONS_SUSPENDED in contexts/SocketContext.tsx */}
          {!NOTIFICATIONS_SUSPENDED && (
            <TouchableOpacity
              onPress={() => router.push("/(root)/notifications")}
              style={{
                width:           40,
                height:          40,
                borderRadius:    RADIUS.pill,
                backgroundColor: COLORS.surfaceMuted,
                alignItems:      "center",
                justifyContent:  "center",
              }}
            >
              <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position:        "absolute",
                    top:              3,
                    right:            3,
                    minWidth:        18,
                    height:          18,
                    paddingHorizontal: 4,
                    borderRadius:     9,
                    backgroundColor:  COLORS.badgeRed,
                    alignItems:      "center",
                    justifyContent:  "center",
                    borderWidth:      1.5,
                    borderColor:      COLORS.surface,
                  }}
                >
                  <Text
                    style={{
                      color: COLORS.surface,
                      fontSize: 9,
                      fontWeight: "700",
                      fontFamily: "DMSans_600SemiBold",
                    }}
                  >
                    {unreadBadgeLabel}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Hero + Search ── */}
        <View
          style={{
            paddingHorizontal: SCREEN_PADDING.content,
            paddingTop:        SPACING.xl,
            paddingBottom:     SPACING.lg,
          }}
        >
          {/* Eyebrow */}
          <Text
            style={{
              fontSize:      11,
              fontWeight:    "500",
              letterSpacing: 3,
              textTransform: "uppercase",
              color:         COLORS.primary,
              marginBottom:   6,
              fontFamily:    "DMSans_500Medium",
            }}
          >
            QuickHands Now
          </Text>

          {/* Editorial headline */}
          <Text
            style={{
              fontSize:      26,
              color:         COLORS.textPrimary,
              lineHeight:    31,
              letterSpacing: -0.5,
              marginBottom:  SPACING.xl,
              fontFamily:    "DMSerifDisplay_400Regular",
            }}
          >
            {"Find "}
            <Text style={{ fontFamily: "DMSerifDisplay_400Regular_Italic", color: COLORS.primary }}>specialists</Text>
            {"\nnear you."}
          </Text>

          {/* Search dock */}
          <View
            style={{
              flexDirection:    "row",
              alignItems:       "center",
              backgroundColor:  COLORS.surface,
              borderRadius:     RADIUS.pill,
              paddingHorizontal: 18,
              paddingVertical:   14,
              gap:               10,
              ...SHADOW.card,
            }}
          >
            <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search for a specialist or service"
              placeholderTextColor={COLORS.textMuted}
              style={{ flex: 1, fontSize: 13, color: COLORS.textPrimary, fontFamily: "DMSans_400Regular" }}
            />
            {isSearching && (
              <Text style={{ fontSize: 10, color: COLORS.textMuted }}>Searching…</Text>
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
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
                    borderRadius:       RADIUS.pill,
                    backgroundColor:   isActive ? COLORS.primarySoft : COLORS.surfaceMuted,
                    borderWidth:        1,
                    borderColor:       isActive ? COLORS.primary : COLORS.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize:   11.5,
                      fontWeight: "500",
                      color:      isActive ? COLORS.primaryDark : COLORS.textSecondary,
                      fontFamily: "DMSans_500Medium",
                    }}
                  >
                    {term}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Search results — labelled + divided so they read as a distinct state */}
          {searchQuery.length > 0 && (searchResults.length > 0 || !isSearching) && (
            <View style={{ marginTop: SPACING.md }}>
              <Text
                style={{
                  fontSize:      10,
                  fontWeight:    "600",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color:         COLORS.textMuted,
                  marginBottom:   8,
                  fontFamily:    "DMSans_600SemiBold",
                }}
              >
                Results
              </Text>
              <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: SPACING.sm }} />

              {searchResults.length > 0 && (
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 10, fontFamily: "DMSans_600SemiBold" }}>
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} found
                  </Text>
                  {searchResults.map((job: any) => (
                    <View
                      key={job.id}
                      style={{
                        backgroundColor: COLORS.surface,
                        borderRadius:    RADIUS.xl,
                        padding:          SPACING.md,
                        marginBottom:      10,
                        ...SHADOW.card,
                      }}
                    >
                      <Text style={{ fontSize: 13.5, fontWeight: "600", color: COLORS.textPrimary, fontFamily: "DMSans_600SemiBold" }}>
                        {job.serviceType}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontFamily: "DMSans_400Regular" }}>
                        Budget: ${job.maxPrice} · {job.specialistChoice || "Any specialist"}
                      </Text>
                      {job.additionalInfo && (
                        <Text numberOfLines={2} style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4, fontFamily: "DMSans_400Regular" }}>
                          {job.additionalInfo}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {!isSearching && searchResults.length === 0 && (
                <View style={{ paddingVertical: 28, paddingHorizontal: 20, backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, alignItems: "center", ...SHADOW.card }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: COLORS.infoSoft,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="search-outline" size={22} color={COLORS.info} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, textAlign: "center", fontFamily: "DMSans_600SemiBold" }}>
                    No specialists in this category
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: "center", lineHeight: 17, fontFamily: "DMSans_400Regular" }}>
                    {`We couldn't find a match for "${searchQuery}". Try a different service or check back soon.`}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Popular Services ── */}
        <View
          style={{
            paddingTop:    SPACING.xl,
            paddingBottom:  8,
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
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, fontFamily: "DMSans_600SemiBold" }}>
              Popular Services
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: "600", fontFamily: "DMSans_500Medium" }}>
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
                  borderRadius:    RADIUS.xl,
                  overflow:        "hidden",
                  backgroundColor: COLORS.surface,
                  ...SHADOW.card,
                }}
              >
                {/* Image area with accent bg */}
                <View style={{ height: 170, backgroundColor: provider.accentColor }}>
                  <Image
                    source={{ uri: provider.image }}
                    style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                  />
                  {/* Bottom gradient scrim for legibility */}
                  <LinearGradient
                    colors={["transparent", "rgba(15, 23, 42, 0.38)"]}
                    style={{
                      position: "absolute",
                      left:      0,
                      right:     0,
                      bottom:    0,
                      height:   64,
                    }}
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
                      borderRadius:       RADIUS.pill,
                      paddingHorizontal: 9,
                      paddingVertical:    4,
                    }}
                  >
                    <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.primary }} />
                    <Text style={{ fontSize: 10.5, fontWeight: "600", color: COLORS.textPrimary, fontFamily: "DMSans_600SemiBold" }}>
                      {provider.providerCount.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Card footer */}
                <View style={{ padding: SPACING.md, backgroundColor: COLORS.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, fontFamily: "DMSans_600SemiBold" }}>
                    {provider.title}
                  </Text>
                  {/* Count itself lives on the image chip above — label only here */}
                  <Text style={{ fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2, fontFamily: "DMSans_400Regular" }}>
                    providers available
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── How it works — inline, no card chrome ── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING.content, paddingVertical: SPACING.lg }}>
          <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 14, fontFamily: "DMSans_600SemiBold" }}>
            How it works
          </Text>
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            {/* Step 1 */}
            <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View
                style={{
                  width:           48,
                  height:          48,
                  borderRadius:    RADIUS.xl,
                  backgroundColor: COLORS.infoSoft,
                  alignItems:      "center",
                  justifyContent:  "center",
                }}
              >
                <Ionicons name="search" size={20} color={COLORS.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: COLORS.textPrimary, fontFamily: "DMSans_600SemiBold" }}>
                  Find a Pro
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 3, lineHeight: 16, fontFamily: "DMSans_400Regular" }}>
                  Search verified professionals
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <View
                style={{
                  width:           48,
                  height:          48,
                  borderRadius:    RADIUS.xl,
                  backgroundColor: COLORS.accentAmberSoft,
                  alignItems:      "center",
                  justifyContent:  "center",
                }}
              >
                <Ionicons name="star" size={20} color={COLORS.accentAmber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: "600", color: COLORS.textPrimary, fontFamily: "DMSans_600SemiBold" }}>
                  Read Reviews
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 3, lineHeight: 16, fontFamily: "DMSans_400Regular" }}>
                  Real ratings from customers
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Utility rows — low-emphasis list ── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING.content, paddingBottom: SPACING.md }}>
          <View style={{ backgroundColor: COLORS.surface, borderRadius: RADIUS.xl, ...SHADOW.card }}>
            {/* Feedback */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                flexDirection:     "row",
                alignItems:        "center",
                gap:                12,
                paddingVertical:    SPACING.sm,
                paddingHorizontal:  SPACING.md,
              }}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: RADIUS.lg,
                  backgroundColor: COLORS.accentPurpleSoft,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="clipboard-outline" size={18} color={COLORS.accentPurple} />
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: "600", color: COLORS.textPrimary, lineHeight: 18, fontFamily: "DMSans_600SemiBold" }}>
                How do you like the app?
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: COLORS.borderSoft, marginLeft: SPACING.md + 40 + 12 }} />

            {/* Support */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={{
                flexDirection:     "row",
                alignItems:        "center",
                gap:                12,
                paddingVertical:    SPACING.sm,
                paddingHorizontal:  SPACING.md,
              }}
            >
              <View
                style={{
                  width: 40, height: 40, borderRadius: RADIUS.lg,
                  backgroundColor: COLORS.accentAmberSoft,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Ionicons name="mail-outline" size={18} color={COLORS.accentAmber} />
              </View>
              <Text style={{ flex: 1, fontSize: 12.5, fontWeight: "600", color: COLORS.textPrimary, lineHeight: 18, fontFamily: "DMSans_600SemiBold" }}>
                Contact Support
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Specialist CTA — promoted to primary gradient card ── */}
        <View style={{ paddingHorizontal: SCREEN_PADDING.content, paddingBottom: SPACING.md }}>
          <TouchableOpacity
            activeOpacity={0.88}
            style={{ borderRadius: RADIUS.xl, overflow: "hidden", ...SHADOW.raised }}
          >
            <LinearGradient
              colors={GRADIENT.brand}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{
                flexDirection:  "row",
                alignItems:     "center",
                justifyContent: "space-between",
                padding:         SPACING.lg,
                gap:             12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#ffffff", fontFamily: "DMSans_600SemiBold" }}>
                  Are you a specialist?
                </Text>
                <Text style={{ fontSize: 11.5, color: "rgba(255,255,255,0.75)", marginTop: 3, lineHeight: 17, fontFamily: "DMSans_400Regular" }}>
                  Find clients and earn with QuickHands
                </Text>
              </View>
              {/* Arrow badge */}
              <View
                style={{
                  width:           34,
                  height:          34,
                  borderRadius:    17,
                  backgroundColor: "rgba(255,255,255,0.18)",
                  alignItems:      "center",
                  justifyContent:  "center",
                }}
              >
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* ── Floating "+" FAB ── */}
      <View
        style={{
          position:   "absolute",
          bottom:     22,
          left:        0,
          right:       0,
          alignItems: "center",
          zIndex:     10,
          ...SHADOW.raised,
        }}
      >
        <TouchableOpacity
          onPress={() => setPostJobVisible(true)}
          activeOpacity={0.88}
          style={{ width: 60, height: 60, borderRadius: 30, overflow: "hidden" }}
        >
          <LinearGradient
            colors={GRADIENT.brand}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <PostJobModal visible={postJobVisible} onClose={() => setPostJobVisible(false)} />

    </SafeAreaView>
  )
}

export default HomeScreen
