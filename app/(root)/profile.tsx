"use client"

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"
import { useUser, useAuth } from "@clerk/clerk-expo"
import {
  Briefcase,
  Star,
  Wallet,
  Settings,
  LogOut,
  Plus,
  ChevronRight,
  CreditCard,
  Heart,
  Search,
  BarChart3,
} from "lucide-react-native"
import { router } from "expo-router"
import { COLORS, SHADOW, GRADIENT } from "@/constants/theme"
import { RADIUS } from "@/constants/layout"
import { fetchWithRetry, getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import { showErrorToast } from "@/lib/toast"

// ─── Shadow tokens ─────────────────────────────────────────────────────────────
// Warm-tinted shadow tokens from the shared design system — cards float on
// cream instead of using cool black shadows.
const shadow = {
  card: SHADOW.card,
  raised: SHADOW.raised,
}

// ─── Component ─────────────────────────────────────────────────────────────────
const Profile = () => {
  const { user } = useUser()
  const { signOut, getToken } = useAuth()
  const [stats, setStats] = useState({ tasksPosted: 0, avgRating: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return
      try {
        const token = await waitForClerkToken(getToken)
        if (!token) { setLoading(false); return }

        const jobsResponse = await fetchWithRetry(getApiUrl(`/api/jobs?clerkId=${user.id}`))
        const jobsData = await jobsResponse.json()
        const tasksPosted = jobsData.success ? jobsData.data.length : 0

        const appsResponse = await fetchWithRetry(getApiUrl("/api/applications/client"), {
          headers: { Authorization: `Bearer ${token}` },
        })
        const appsData = await appsResponse.json()

        let totalSpent = 0, totalRatings = 0, ratingCount = 0

        if (appsData.success && Array.isArray(appsData.data)) {
          appsData.data.forEach((job: any) => {
            const acceptedApps = job.applications?.filter((a: any) => a.status === "accepted") || []
            acceptedApps.forEach((app: any) => {
              if (app.quotation) {
                const amount = parseFloat(app.quotation.replace(/[^0-9.-]+/g, ""))
                if (!isNaN(amount)) totalSpent += amount
              }
              if (app.rating) { totalRatings += app.rating; ratingCount++ }
            })
          })
        }

        setStats({
          tasksPosted,
          avgRating: ratingCount > 0 ? totalRatings / ratingCount : 0,
          totalSpent,
        })
      } catch (error) {
        console.error("Error fetching profile stats:", error)
        showErrorToast("Couldn't load your stats", "Pull down to try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [getToken, user?.id])

  if (!user) return null

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >

        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-4">
          <View>
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary }} />
              <Text className="text-[10px] font-bold tracking-[2.5px] uppercase" style={{ color: COLORS.primary }}>
                Account
              </Text>
            </View>
            <Text className="text-[34px] font-bold tracking-tight leading-none" style={{ color: COLORS.textPrimary }}>
              Profile
            </Text>
          </View>

          <Pressable
            className="w-11 h-11 items-center justify-center"
            style={{
              borderRadius: RADIUS.lg,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.border,
              ...shadow.card,
            }}
          >
            <Settings size={18} color={COLORS.textSecondary} strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ── Hero Card ── */}
        <View className="px-5 pb-2">
          <View
            style={{ borderRadius: RADIUS.xxl, overflow: "hidden", ...shadow.raised }}
          >
          <LinearGradient
            colors={GRADIENT.brand}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.95, y: 1 }}
          >
            {/* Top shine */}
            <View className="absolute top-0 left-0 right-0 h-px bg-white/10" />

            {/* Decorative rings */}
            <View
              className="absolute rounded-full border"
              style={{ width: 180, height: 180, top: -70, right: -60, borderColor: `${COLORS.primary}26` }}
            />
            <View
              className="absolute rounded-full border"
              style={{ width: 100, height: 100, top: -20, right: -20, borderColor: `${COLORS.primary}1A` }}
            />
            <View
              className="absolute rounded-full border border-white/5"
              style={{ width: 240, height: 240, bottom: -120, left: -60 }}
            />

            {/* ── Avatar + Info ── */}
            <View className="px-5 pt-6 pb-5">
              <View className="flex-row items-center gap-4">
                {/* Avatar */}
                <View style={shadow.card}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryDark]}
                    className="w-[76px] h-[76px] rounded-[26px] items-center justify-center"
                  >
                    <View className="w-[70px] h-[70px] rounded-[23px] overflow-hidden"
                      style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.2)" }}
                    >
                      <Image
                        source={{ uri: user.imageUrl }}
                        style={{ width: 70, height: 70 }}
                        resizeMode="cover"
                      />
                    </View>
                  </LinearGradient>
                  {/* Online dot */}
                  <View
                    className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full"
                    style={{ backgroundColor: "#4ADE80", borderWidth: 2, borderColor: "#0C1A10" }}
                  />
                </View>

                {/* Name / email */}
                <View className="flex-1">
                  <Text className="text-white text-[21px] font-bold tracking-tight mb-2" numberOfLines={1}>
                    {user.fullName || "Unnamed User"}
                  </Text>
                  <View
                    className="self-start flex-row items-center gap-1.5 rounded-xl px-3 py-1.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}
                  >
                    <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.primary }} />
                    <Text className="text-white/60 text-[11px] font-medium" numberOfLines={1}>
                      {user.primaryEmailAddress?.emailAddress}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Stats strip ── */}
            <View
              className="flex-row"
              style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}
            >
              {loading ? (
                <View className="flex-1 py-6 items-center justify-center">
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                </View>
              ) : (
                <>
                  <StatCell
                    icon={Briefcase}
                    label="Tasks Posted"
                    value={stats.tasksPosted > 0 ? stats.tasksPosted.toString() : "0"}
                  />
                  <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                  <StatCell
                    icon={Star}
                    label="Rating"
                    value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"}
                    isStar
                  />
                  <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                  <StatCell
                    icon={Wallet}
                    label="Total Spent"
                    value={stats.totalSpent > 0 ? `$${stats.totalSpent.toLocaleString()}` : "$0"}
                  />
                </>
              )}
            </View>
          </LinearGradient>
          </View>
        </View>

        {/* ── Post a New Task CTA ── */}
        <View className="px-5 pt-4">
          <Pressable
            onPress={() => router.push("/(root)/service")}
            className="flex-row items-center justify-center gap-2 py-4"
            style={{ borderRadius: RADIUS.pill, backgroundColor: COLORS.primary, ...shadow.raised }}
          >
            <Plus size={18} color="#fff" strokeWidth={2.4} />
            <Text className="text-[15px] font-bold" style={{ color: "#fff" }}>
              Post a New Task
            </Text>
          </Pressable>
        </View>

        {/* ── Manage section ── */}
        <View className="px-5 mt-6">
          <Text className="text-[10px] font-bold tracking-[2.5px] uppercase mb-3 pl-1" style={{ color: COLORS.textMuted }}>
            Manage
          </Text>

          <View
            className="overflow-hidden"
            style={{ borderRadius: RADIUS.xl, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderSoft, ...shadow.card }}
          >
            <MenuRow
              icon={Briefcase}
              title="My Tasks"
              subtitle="View, edit, and manage tasks"
              accentLight={COLORS.primarySoft}
              accentIcon={COLORS.primary}
              onPress={() => router.push("/(root)/applications")}
            />
            <View className="h-px mx-4" style={{ backgroundColor: COLORS.borderSoft }} />
            <MenuRow
              icon={Heart}
              title="Favorites"
              subtitle="Freelancers you'd rehire"
              accentLight={COLORS.accentPurpleSoft}
              accentIcon={COLORS.accentPurple}
              onPress={() => router.push("/(root)/favorites")}
            />
            <View className="h-px mx-4" style={{ backgroundColor: COLORS.borderSoft }} />
            <MenuRow
              icon={Search}
              title="Saved Searches"
              subtitle="Get notified about matching specialists"
              accentLight={COLORS.accentAmberSoft}
              accentIcon={COLORS.accentAmber}
              onPress={() => router.push("/(root)/saved-searches")}
            />
            <View className="h-px mx-4" style={{ backgroundColor: COLORS.borderSoft }} />
            <MenuRow
              icon={BarChart3}
              title="Analytics"
              subtitle="Jobs posted, spend, response time"
              accentLight={COLORS.accentGreenSoft}
              accentIcon={COLORS.accentGreen}
              onPress={() => router.push("/(root)/analytics")}
            />
            <View className="h-px mx-4" style={{ backgroundColor: COLORS.borderSoft }} />
            <MenuRow
              icon={CreditCard}
              title="Payments & Billing"
              subtitle="Spending history and invoices"
              accentLight={COLORS.infoSoft}
              accentIcon={COLORS.info}
            />
            <View className="h-px mx-4" style={{ backgroundColor: COLORS.borderSoft }} />
            <MenuRow
              icon={Settings}
              title="Account Settings"
              subtitle="Security, notifications, preferences"
              accentLight={COLORS.surfaceMuted}
              accentIcon={COLORS.textSecondary}
              last
            />
          </View>
        </View>

        {/* ── Sign Out ── */}
        <View className="px-5 mt-4">
          <Pressable
            onPress={() => signOut()}
            className="flex-row items-center justify-center gap-3 py-4"
            style={{ borderRadius: RADIUS.xl, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, ...shadow.card }}
          >
            <View
              className="w-9 h-9 items-center justify-center"
              style={{ borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceMuted, borderWidth: 1, borderColor: COLORS.border }}
            >
              <LogOut size={15} color={COLORS.badgeRed} strokeWidth={1.8} />
            </View>
            <Text className="text-[14px] font-semibold" style={{ color: COLORS.badgeRed }}>
              Sign Out
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile

// ─── StatCell ─────────────────────────────────────────────────────────────────
const StatCell = ({
  icon: Icon,
  label,
  value,
  isStar = false,
}: {
  icon: any
  label: string
  value: string
  isStar?: boolean
}) => (
  <View className="flex-1 items-center py-5 px-2">
    <Icon
      size={14}
      color={isStar ? COLORS.accentAmber : "rgba(255,255,255,0.35)"}
      fill={isStar ? COLORS.accentAmber : "none"}
      strokeWidth={isStar ? 0 : 1.8}
      style={{ marginBottom: 8 }}
    />
    <Text className="text-white text-[17px] font-bold tracking-tight mb-0.5">
      {value}
    </Text>
    <Text className="text-white/35 text-[9px] font-bold tracking-widest uppercase text-center">
      {label}
    </Text>
  </View>
)

// ─── MenuRow ──────────────────────────────────────────────────────────────────
const MenuRow = ({
  icon: Icon,
  title,
  subtitle,
  accentLight,
  accentIcon,
  last = false,
  onPress,
}: {
  icon: any
  title: string
  subtitle: string
  accentLight: string
  accentIcon: string
  last?: boolean
  onPress?: () => void
}) => (
  <Pressable onPress={onPress} className="flex-row items-center px-4 py-[15px] gap-3.5">
    <View
      className="w-10 h-10 items-center justify-center"
      style={{ borderRadius: RADIUS.pill, backgroundColor: accentLight, borderWidth: 1, borderColor: `${accentIcon}22` }}
    >
      <Icon size={17} color={accentIcon} strokeWidth={1.8} />
    </View>

    <View className="flex-1">
      <Text className="text-[13.5px] font-semibold mb-0.5" style={{ color: COLORS.textPrimary }}>{title}</Text>
      <Text className="text-[11px]" style={{ color: COLORS.textSecondary }}>{subtitle}</Text>
    </View>

    <View className="w-7 h-7 items-center justify-center" style={{ borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceMuted }}>
      <ChevronRight size={13} color={COLORS.textMuted} strokeWidth={2.2} />
    </View>
  </Pressable>
)