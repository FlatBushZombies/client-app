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

// ─── Design Tokens ────────────────────────────────────────────
const C = {
  // Green primary
  navy:       "#1A7F5A",   // primary green (matches ServiceRequestScreen)
  navyDark:   "#0F5C3F",
  navyMid:    "#1E8F65",
  navyLight:  "#239970",
  navyGhost:  "#2AAD7E",

  // White surface
  bg:         "#FFFFFF",
  surface:    "#FFFFFF",
  surfaceAlt: "#F0F7F4",
  border:     "#CEEADE",
  borderSub:  "#E3F2EC",

  // Text
  textDark:   "#0D3D27",
  textSub:    "#3D7A5E",
  textMuted:  "#6DAF92",
  textFaint:  "#93C9AE",

  // Accents
  fern:       "#1A7F5A",
  fernSoft:   "#E6F5EE",
  fernGlow:   "#52B78820",
  leaf:       "#74C69D",

  cloud:      "#FFFFFF",

  // Danger
  red:        "#EF4444",
  redBg:      "rgba(239,68,68,0.06)",
  redBorder:  "rgba(239,68,68,0.2)",
}

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
// ──────────────────────────────────────────────────────────────

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

        // Fetch jobs posted by this client
        const jobsResponse = await fetch(
          `https://quickhands-api.vercel.app/api/jobs?clerkId=${user.id}`
        )
        const jobsData = await jobsResponse.json()
        const tasksPosted = jobsData.success ? jobsData.data.length : 0

        // Fetch applications to calculate ratings and spending
        const appsResponse = await fetch(
          'https://quickhands-api.vercel.app/api/applications/client',
          {
            headers: { 'Authorization': `Bearer ${token}` },
          }
        )
        const appsData = await appsResponse.json()
        
        let totalSpent = 0
        let totalRatings = 0
        let ratingCount = 0
        
        if (appsData.success && Array.isArray(appsData.data)) {
          appsData.data.forEach((job: any) => {
            const acceptedApps = job.applications?.filter((app: any) => app.status === 'accepted') || []
            acceptedApps.forEach((app: any) => {
              // Sum up quotations for total spent
              if (app.quotation) {
                const amount = parseFloat(app.quotation.replace(/[^0-9.-]+/g, ''))
                if (!isNaN(amount)) totalSpent += amount
              }
              // Average ratings (if we had them)
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
        console.error('Error fetching profile stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user?.id])

  if (!user) return null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >

        {/* ── Header ── */}
        <View style={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 8,
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: C.fern,
              }} />
              <Text style={{
                color: C.textMuted,
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}>
                Account
              </Text>
            </View>
            <Text style={{
              color: C.textDark,
              fontSize: 34,
              fontWeight: "900",
              letterSpacing: -1.5,
              lineHeight: 40,
            }}>
              Profile
            </Text>
          </View>

          {/* Settings pill */}
          <Pressable style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: 14,
            backgroundColor: pressed ? C.border : C.surfaceAlt,
            borderWidth: 1.5,
            borderColor: C.border,
            alignItems: "center",
            justifyContent: "center",
            marginTop: 2,
          })}>
            <Settings size={18} color={C.fern} />
          </Pressable>
        </View>

        {/* ── Hero User Card ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 14 }}>
          <View style={{
            backgroundColor: C.fern,
            borderRadius: 28,
            overflow: "hidden",
            ...shadow.glow,
          }}>
            {/* Subtle top shine */}
            <View style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: 1.5,
              backgroundColor: "rgba(255,255,255,0.25)",
            }} />

            <View style={{ padding: 24 }}>
              {/* Avatar + Name row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
                <View style={{ position: "relative", marginRight: 16 }}>
                  <View style={{
                    width: 70,
                    height: 70,
                    borderRadius: 22,
                    borderWidth: 2.5,
                    borderColor: "rgba(255,255,255,0.35)",
                    overflow: "hidden",
                    backgroundColor: C.navyMid,
                  }}>
                    <Image
                      source={{ uri: user.imageUrl }}
                      style={{ width: 70, height: 70 }}
                      resizeMode="cover"
                    />
                  </View>
                  {/* Online dot */}
                  <View style={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: "#4ADE80",
                    borderWidth: 2.5,
                    borderColor: C.fern,
                  }} />
                </View>

                {/* Name & email */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: C.cloud,
                    fontSize: 20,
                    fontWeight: "800",
                    letterSpacing: -0.6,
                    marginBottom: 6,
                  }}>
                    {user.fullName || "Unnamed User"}
                  </Text>
                  <View style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 9,
                    alignSelf: "flex-start",
                  }}>
                    <Text style={{
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 11,
                      fontWeight: "600",
                      letterSpacing: 0.1,
                    }} numberOfLines={1}>
                      {user.primaryEmailAddress?.emailAddress}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats row */}
              <View style={{
                flexDirection: "row",
                backgroundColor: "rgba(255,255,255,0.12)",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                overflow: "hidden",
              }}>
                {loading ? (
                  <View style={{ flex: 1, paddingVertical: 18, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
                  </View>
                ) : (
                  <>
                    <Metric icon={Briefcase} label="Tasks Posted" value={stats.tasksPosted > 0 ? stats.tasksPosted.toString() : "0"} />
                    <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.15)" }} />
                    <Metric icon={Star} label="Rating" value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "N/A"} />
                    <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.15)" }} />
                    <Metric icon={Wallet} label="Total Spent" value={stats.totalSpent > 0 ? `$${stats.totalSpent.toLocaleString()}` : "$0"} />
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── Primary CTA ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Pressable
            onPress={() => router.push("/(root)/service")}
            style={({ pressed }) => ({
              backgroundColor: pressed ? C.navyDark : C.surfaceAlt,
              borderRadius: 18,
              paddingVertical: 17,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: pressed ? 0.92 : 1,
              borderWidth: 1.5,
              borderColor: C.border,
              ...shadow.sm,
            })}
          >
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: C.fern,
              alignItems: "center",
              justifyContent: "center",
              ...shadow.sm,
            }}>
              <PlusCircle size={17} color="white" />
            </View>
            <Text style={{
              color: C.textDark,
              fontWeight: "800",
              fontSize: 15,
              letterSpacing: 0.1,
            }}>
              Post a New Task
            </Text>
          </Pressable>
        </View>

        {/* ── Account Options ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{
            color: C.textMuted,
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.8,
            textTransform: "uppercase",
            marginBottom: 12,
            paddingLeft: 4,
          }}>
            Manage
          </Text>

          <View style={{
            backgroundColor: C.surface,
            borderRadius: 24,
            borderWidth: 1.5,
            borderColor: C.border,
            overflow: "hidden",
            ...shadow.card,
          }}>
            <ProfileRow
              icon={Briefcase}
              title="My Tasks"
              subtitle="View, edit, and manage tasks"
            />
            <Divider />
            <ProfileRow
              icon={Wallet}
              title="Payments & Billing"
              subtitle="Spending history and invoices"
            />
            <Divider />
            <ProfileRow
              icon={Settings}
              title="Account Settings"
              subtitle="Security, notifications, preferences"
              last
            />
          </View>
        </View>

        {/* ── Sign Out ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              borderRadius: 18,
              paddingVertical: 16,
              backgroundColor: pressed ? "rgba(239,68,68,0.1)" : C.redBg,
              borderWidth: 1.5,
              borderColor: C.redBorder,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: "rgba(239,68,68,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <LogOut size={16} color={C.red} />
            </View>
            <Text style={{
              color: C.red,
              fontWeight: "700",
              fontSize: 15,
              letterSpacing: 0.1,
            }}>
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
  <View style={{
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
  }}>
    <Icon size={15} color="rgba(255,255,255,0.7)" style={{ marginBottom: 8 }} />
    <Text style={{
      color: C.cloud,
      fontWeight: "900",
      fontSize: 16,
      letterSpacing: -0.5,
      marginBottom: 3,
    }}>
      {value}
    </Text>
    <Text style={{
      color: "rgba(255,255,255,0.6)",
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.2,
      textAlign: "center",
    }}>
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
  <Pressable
    style={({ pressed }) => ({
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 17,
      backgroundColor: pressed ? C.surfaceAlt : "transparent",
    })}
  >
    {/* Icon block */}
    <View style={{
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: C.fernSoft,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      borderWidth: 1,
      borderColor: C.border,
    }}>
      <Icon size={18} color={C.fern} />
    </View>

    {/* Text */}
    <View style={{ flex: 1 }}>
      <Text style={{
        color: C.textDark,
        fontWeight: "700",
        fontSize: 14,
        letterSpacing: -0.2,
        marginBottom: 3,
      }}>
        {title}
      </Text>
      <Text style={{
        color: C.textMuted,
        fontSize: 12,
        fontWeight: "400",
        letterSpacing: 0.1,
      }}>
        {subtitle}
      </Text>
    </View>

    {/* Chevron */}
    <View style={{
      width: 28,
      height: 28,
      borderRadius: 9,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    }}>
      <ChevronRight size={14} color={C.textMuted} />
    </View>
  </Pressable>
)

const Divider = () => (
  <View style={{
    height: 1,
    backgroundColor: C.borderSub,
    marginHorizontal: 20,
  }} />
)