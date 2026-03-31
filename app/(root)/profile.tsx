"use client"

import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
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
} from "lucide-react-native"
import { router } from "expo-router"
import { getApiUrl } from "@/lib/fetch"

// ─── Shadow tokens ─────────────────────────────────────────────────────────────
const shadow = {
  card: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 2 },
  }),
  hero: Platform.select({
    ios: { shadowColor: "#0f1f14", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.22, shadowRadius: 32 },
    android: { elevation: 12 },
  }),
  avatar: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12 },
    android: { elevation: 6 },
  }),
  stat: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
    android: { elevation: 1 },
  }),
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
        const token = await getToken()
        if (!token) { setLoading(false); return }

        const jobsResponse = await fetch(getApiUrl(`/api/jobs?clerkId=${user.id}`))
        const jobsData = await jobsResponse.json()
        const tasksPosted = jobsData.success ? jobsData.data.length : 0

        const appsResponse = await fetch(getApiUrl("/api/applications/client"), {
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
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [getToken, user?.id])

  if (!user) return null

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >

        {/* ── Header ── */}
        <View className="flex-row items-center justify-between px-5 pt-6 pb-4">
          <View>
            <View className="flex-row items-center gap-1.5 mb-1">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <Text className="text-emerald-600 text-[10px] font-bold tracking-[2.5px] uppercase">
                Account
              </Text>
            </View>
            <Text className="text-neutral-900 text-[34px] font-bold tracking-tight leading-none">
              Profile
            </Text>
          </View>

          <Pressable
            className="w-10 h-10 rounded-2xl bg-neutral-100 items-center justify-center"
            style={shadow.stat}
          >
            <Settings size={17} color="#374151" strokeWidth={1.8} />
          </Pressable>
        </View>

        {/* ── Hero Card ── */}
        <View className="px-4 pb-2">
          <View
            className="rounded-[28px] overflow-hidden"
            style={[{ backgroundColor: "#0C1A10" }, shadow.hero]}
          >
            {/* Top shine */}
            <View className="absolute top-0 left-0 right-0 h-px bg-white/10" />

            {/* Decorative rings */}
            <View
              className="absolute rounded-full border border-emerald-400/15"
              style={{ width: 180, height: 180, top: -70, right: -60 }}
            />
            <View
              className="absolute rounded-full border border-emerald-400/10"
              style={{ width: 100, height: 100, top: -20, right: -20 }}
            />
            <View
              className="absolute rounded-full border border-white/5"
              style={{ width: 240, height: 240, bottom: -120, left: -60 }}
            />

            {/* ── Avatar + Info ── */}
            <View className="px-5 pt-6 pb-5">
              <View className="flex-row items-center gap-4">
                {/* Avatar */}
                <View style={shadow.avatar}>
                  <View className="w-[72px] h-[72px] rounded-[22px] overflow-hidden bg-emerald-950"
                    style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.15)" }}
                  >
                    <Image
                      source={{ uri: user.imageUrl }}
                      style={{ width: 72, height: 72 }}
                      resizeMode="cover"
                    />
                  </View>
                  {/* Online dot */}
                  <View
                    className="absolute bottom-0.5 right-0.5 w-[11px] h-[11px] rounded-full bg-emerald-400"
                    style={{ borderWidth: 2, borderColor: "#0C1A10" }}
                  />
                </View>

                {/* Name / email */}
                <View className="flex-1">
                  <Text className="text-white text-[20px] font-bold tracking-tight mb-2">
                    {user.fullName || "Unnamed User"}
                  </Text>
                  <View
                    className="self-start rounded-[10px] px-3 py-1.5"
                    style={{ backgroundColor: "rgba(255,255,255,0.09)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" }}
                  >
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
          </View>
        </View>

        {/* ── Post a New Task CTA ── */}
        <View className="px-4 pt-4">
          <Pressable
            onPress={() => router.push("/(root)/service")}
            className="flex-row items-center bg-white rounded-[20px] px-4 py-4 border border-neutral-100 gap-3.5"
            style={shadow.card}
          >
            <View
              className="w-10 h-10 rounded-[14px] bg-neutral-900 items-center justify-center"
              style={shadow.avatar}
            >
              <Plus size={17} color="#fff" strokeWidth={2.2} />
            </View>
            <Text className="flex-1 text-neutral-900 text-[14px] font-semibold">
              Post a New Task
            </Text>
            <View className="w-7 h-7 rounded-[9px] bg-neutral-100 items-center justify-center">
              <ChevronRight size={13} color="#a3a3a3" strokeWidth={2.2} />
            </View>
          </Pressable>
        </View>

        {/* ── Manage section ── */}
        <View className="px-4 mt-6">
          <Text className="text-neutral-400 text-[10px] font-bold tracking-[2.5px] uppercase mb-3 pl-1">
            Manage
          </Text>

          <View
            className="bg-white rounded-[22px] border border-neutral-100 overflow-hidden"
            style={shadow.card}
          >
            <MenuRow
              icon={Briefcase}
              title="My Tasks"
              subtitle="View, edit, and manage tasks"
              accentLight="#f0fdf4"
              accentIcon="#16a34a"
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <MenuRow
              icon={CreditCard}
              title="Payments & Billing"
              subtitle="Spending history and invoices"
              accentLight="#eff6ff"
              accentIcon="#2563eb"
            />
            <View className="h-px bg-neutral-50 mx-4" />
            <MenuRow
              icon={Settings}
              title="Account Settings"
              subtitle="Security, notifications, preferences"
              accentLight="#f9fafb"
              accentIcon="#374151"
              last
            />
          </View>
        </View>

        {/* ── Sign Out ── */}
        <View className="px-4 mt-4">
          <Pressable
            onPress={() => signOut()}
            className="flex-row items-center justify-center gap-3 rounded-[20px] py-4 bg-white border border-rose-100"
            style={shadow.card}
          >
            <View className="w-9 h-9 rounded-[12px] bg-rose-50 border border-rose-100 items-center justify-center">
              <LogOut size={15} color="#ef4444" strokeWidth={1.8} />
            </View>
            <Text className="text-rose-500 text-[14px] font-semibold">
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
      color={isStar ? "#fbbf24" : "rgba(255,255,255,0.35)"}
      fill={isStar ? "#fbbf24" : "none"}
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
}: {
  icon: any
  title: string
  subtitle: string
  accentLight: string
  accentIcon: string
  last?: boolean
}) => (
  <Pressable className="flex-row items-center px-4 py-[15px] gap-3.5">
    <View
      className="w-10 h-10 rounded-[14px] items-center justify-center"
      style={{ backgroundColor: accentLight, borderWidth: 1, borderColor: `${accentIcon}22` }}
    >
      <Icon size={17} color={accentIcon} strokeWidth={1.8} />
    </View>

    <View className="flex-1">
      <Text className="text-neutral-900 text-[13.5px] font-semibold mb-0.5">{title}</Text>
      <Text className="text-neutral-400 text-[11px]">{subtitle}</Text>
    </View>

    <View className="w-7 h-7 rounded-[9px] bg-neutral-100 items-center justify-center">
      <ChevronRight size={13} color="#a3a3a3" strokeWidth={2.2} />
    </View>
  </Pressable>
)