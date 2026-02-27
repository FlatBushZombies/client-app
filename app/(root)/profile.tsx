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
  PlusCircle,
  ChevronRight,
} from "lucide-react-native"
import { router } from "expo-router"

const shadow = {
  card: Platform.select({
    ios: { shadowColor: "#0F5C3F", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 24 },
    android: { elevation: 6 },
  }),
  glow: Platform.select({
    ios: { shadowColor: "#1A7F5A", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 16 },
    android: { elevation: 8 },
  }),
  btn: Platform.select({
    ios: { shadowColor: "#0F5C3F", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 20 },
    android: { elevation: 10 },
  }),
  sm: Platform.select({
    ios: { shadowColor: "#0D3D27", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 2 },
  }),
}

const Profile = () => {
  const { user } = useUser()
  const { signOut } = useAuth()
  const [stats, setStats] = useState({ tasksPosted: 0, avgRating: 0, totalSpent: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) return

      try {
        const token = await (user as any).getIdToken?.()
        if (!token) {
          setLoading(false)
          return
        }

        const jobsResponse = await fetch(
          `https://quickhands-api.vercel.app/api/jobs?clerkId=${user.id}`
        )
        const jobsData = await jobsResponse.json()
        const tasksPosted = jobsData.success ? jobsData.data.length : 0

        const appsResponse = await fetch(
          "https://quickhands-api.vercel.app/api/applications/client",
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const appsData = await appsResponse.json()

        let totalSpent = 0
        let totalRatings = 0
        let ratingCount = 0

        if (appsData.success && Array.isArray(appsData.data)) {
          appsData.data.forEach((job: any) => {
            const acceptedApps = job.applications?.filter((app: any) => app.status === "accepted") || []
            acceptedApps.forEach((app: any) => {
              if (app.quotation) {
                const amount = parseFloat(app.quotation.replace(/[^0-9.-]+/g, ""))
                if (!isNaN(amount)) totalSpent += amount
              }
              if (app.rating) {
                totalRatings += app.rating
                ratingCount++
              }
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
  }, [user?.id])

  if (!user) return null

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── Header ── */}
        <View className="px-6 pt-5 pb-2 flex-row items-start justify-between">
          <View>
            <View className="flex-row items-center gap-[7px] mb-1.5">
              <View className="w-1.5 h-1.5 rounded-full bg-green-700" />
              <Text className="text-green-400 text-[11px] font-bold tracking-[2px] uppercase font-jakarta-bold">
                Account
              </Text>
            </View>
            <Text className="text-green-950 text-[34px] font-black tracking-[-1.5px] leading-10 font-jakarta-bold">
              Profile
            </Text>
          </View>

          {/* Settings pill */}
          <Pressable className="w-[42px] h-[42px] rounded-[14px] bg-green-50 border-[1.5px] border-green-200 items-center justify-center mt-0.5">
            <Settings size={18} color="#1A7F5A" />
          </Pressable>
        </View>

        {/* ── Hero User Card ── */}
        <View className="px-5 mt-4 mb-3.5">
          <View className="bg-green-700 rounded-[28px] overflow-hidden" style={shadow.glow}>
            {/* Top shine */}
            <View className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/25" />

            <View className="p-6">
              {/* Avatar + Name row */}
              <View className="flex-row items-center mb-6">
                <View className="relative mr-4">
                  <View className="w-[70px] h-[70px] rounded-[22px] border-[2.5px] border-white/35 overflow-hidden bg-green-600">
                    <Image
                      source={{ uri: user.imageUrl }}
                      style={{ width: 70, height: 70 }}
                      resizeMode="cover"
                    />
                  </View>
                  {/* Online dot */}
                  <View className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-[2.5px] border-green-700" />
                </View>

                <View className="flex-1">
                  <Text className="text-white text-xl font-extrabold tracking-[-0.6px] mb-1.5 font-jakarta-bold">
                    {user.fullName || "Unnamed User"}
                  </Text>
                  <View className="bg-white/15 px-2.5 py-[5px] rounded-[9px] self-start">
                    <Text className="text-white/85 text-[11px] font-semibold tracking-wide font-jakarta-semibold" numberOfLines={1}>
                      {user.primaryEmailAddress?.emailAddress}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats row */}
              <View className="flex-row bg-white/10 rounded-[20px] border border-white/20 overflow-hidden">
                {loading ? (
                  <View className="flex-1 py-[18px] items-center">
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                  </View>
                ) : (
                  <>
                    <Metric icon={Briefcase} label="Tasks Posted" value={stats.tasksPosted > 0 ? stats.tasksPosted.toString() : "0"} />
                    <View className="w-px bg-white/15" />
                    <Metric icon={Star} label="Rating" value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"} />
                    <View className="w-px bg-white/15" />
                    <Metric icon={Wallet} label="Total Spent" value={stats.totalSpent > 0 ? `$${stats.totalSpent.toLocaleString()}` : "$0"} />
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── Primary CTA ── */}
        <View className="px-5 mb-7">
          <Pressable
            onPress={() => router.push("/(root)/service")}
            className="bg-green-50 rounded-[18px] py-[17px] flex-row items-center justify-center gap-2.5 border-[1.5px] border-green-200"
            style={shadow.sm}
          >
            <View className="w-8 h-8 rounded-[10px] bg-green-700 items-center justify-center" style={shadow.sm}>
              <PlusCircle size={17} color="white" />
            </View>
            <Text className="text-green-950 font-extrabold text-[15px] tracking-wide font-jakarta-bold">
              Post a New Task
            </Text>
          </Pressable>
        </View>

        {/* ── Account Options ── */}
        <View className="px-5 mb-3">
          <Text className="text-green-400 text-[10px] font-bold tracking-[1.8px] uppercase mb-3 pl-1 font-jakarta-bold">
            Manage
          </Text>

          <View className="bg-white rounded-3xl border-[1.5px] border-green-200 overflow-hidden" style={shadow.card}>
            <ProfileRow icon={Briefcase} title="My Tasks" subtitle="View, edit, and manage tasks" />
            <Divider />
            <ProfileRow icon={Wallet} title="Payments & Billing" subtitle="Spending history and invoices" />
            <Divider />
            <ProfileRow icon={Settings} title="Account Settings" subtitle="Security, notifications, preferences" last />
          </View>
        </View>

        {/* ── Sign Out ── */}
        <View className="px-5 mt-4">
          <Pressable
            onPress={() => signOut()}
            className="flex-row items-center justify-center gap-[9px] rounded-[18px] py-4 bg-red-500/5 border-[1.5px] border-red-500/20"
          >
            <View className="w-8 h-8 rounded-[10px] bg-red-500/10 items-center justify-center">
              <LogOut size={16} color="#EF4444" />
            </View>
            <Text className="text-red-500 font-bold text-[15px] tracking-wide font-jakarta-bold">
              Sign Out
            </Text>
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile

// ─── Supporting Components ─────────────────────────────────────

const Metric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) => (
  <View className="flex-1 items-center py-[18px] px-2">
    <Icon size={15} color="rgba(255,255,255,0.7)" style={{ marginBottom: 8 }} />
    <Text className="text-white font-black text-base tracking-[-0.5px] mb-0.5 font-jakarta-bold">
      {value}
    </Text>
    <Text className="text-white/60 text-[10px] font-semibold tracking-wide text-center font-jakarta-semibold">
      {label}
    </Text>
  </View>
)

const ProfileRow = ({
  icon: Icon,
  title,
  subtitle,
  last = false,
}: {
  icon: any
  title: string
  subtitle: string
  last?: boolean
}) => (
  <Pressable className="flex-row items-center px-5 py-[17px]">
    {/* Icon block */}
    <View className="w-[42px] h-[42px] rounded-[14px] bg-green-50 items-center justify-center mr-3.5 border border-green-200">
      <Icon size={18} color="#1A7F5A" />
    </View>

    {/* Text */}
    <View className="flex-1">
      <Text className="text-green-950 font-bold text-sm tracking-[-0.2px] mb-0.5 font-jakarta-bold">
        {title}
      </Text>
      <Text className="text-green-400 text-xs font-normal tracking-wide font-jakarta">
        {subtitle}
      </Text>
    </View>

    {/* Chevron */}
    <View className="w-7 h-7 rounded-[9px] bg-green-50 border border-green-200 items-center justify-center">
      <ChevronRight size={14} color="#6DAF92" />
    </View>
  </Pressable>
)

const Divider = () => (
  <View className="h-px bg-green-50 mx-5" />
)