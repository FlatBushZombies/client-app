"use client"

import React from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Platform,
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
  // QuickHands navy extracted from logo
  navy:       "#1C2B3A",   // darkest — page bg
  navyDeep:   "#152131",   // deeper variant
  navyCard:   "#223045",   // card surface
  navyBorder: "#2E3F52",   // subtle borders
  navyMid:    "#344D64",   // mid-tone accent
  navyLight:  "#4A6680",   // muted text on dark
  slate:      "#6B8DA8",   // secondary label

  // Green accents (from existing codebase)
  fern:       "#52B788",
  forest:     "#2D6A4F",
  mint:       "#D8EDDA",
  leaf:       "#74C69D",

  // Neutrals
  cloud:      "#FFFFFF",
  mist:       "#F0F4F8",
  fog:        "#E2EAF0",

  // Danger
  red:        "#EF4444",
  redBg:      "rgba(239,68,68,0.08)",
  redBorder:  "rgba(239,68,68,0.25)",
}

const shadow = {
  card: Platform.select({
    ios: { shadowColor: "#0A1520", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 28 },
    android: { elevation: 10 },
  }),
  glow: Platform.select({
    ios: { shadowColor: "#52B788", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 18 },
    android: { elevation: 8 },
  }),
  btn: Platform.select({
    ios: { shadowColor: "#0A1520", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20 },
    android: { elevation: 12 },
  }),
  sm: Platform.select({
    ios: { shadowColor: "#0A1520", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8 },
    android: { elevation: 2 },
  }),
}
// ──────────────────────────────────────────────────────────────

const Profile = () => {
  const { user } = useUser()
  const { signOut } = useAuth()

  if (!user) return null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: 22, paddingTop: 24, marginBottom: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <View style={{
              width: 6, height: 6, borderRadius: 3,
              backgroundColor: C.fern,
            }} />
            <Text style={{
              color: C.slate,
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}>
              Account
            </Text>
          </View>
          <Text style={{
            color: C.cloud,
            fontSize: 34,
            fontWeight: "900",
            letterSpacing: -1.5,
            lineHeight: 40,
          }}>
            Profile
          </Text>
        </View>

        {/* ── Hero User Card ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: C.navyCard,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: C.navyBorder,
            overflow: "hidden",
            ...shadow.card,
          }}>
            {/* Top accent line */}
            <View style={{
              height: 2.5,
              backgroundColor: C.fern,
              marginHorizontal: 40,
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2,
              opacity: 0.85,
            }} />

            <View style={{ padding: 24 }}>
              {/* Avatar + Name row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
                {/* Avatar with glow ring */}
                <View style={{
                  position: "relative",
                  marginRight: 16,
                }}>
                  <View style={{
                    width: 72,
                    height: 72,
                    borderRadius: 24,
                    borderWidth: 2,
                    borderColor: `${C.fern}50`,
                    overflow: "hidden",
                    backgroundColor: C.navyMid,
                    ...shadow.glow,
                  }}>
                    <Image
                      source={{ uri: user.imageUrl }}
                      style={{ width: 72, height: 72 }}
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
                    backgroundColor: C.fern,
                    borderWidth: 2.5,
                    borderColor: C.navyCard,
                  }} />
                </View>

                {/* Name & email */}
                <View style={{ flex: 1 }}>
                  <Text style={{
                    color: C.cloud,
                    fontSize: 19,
                    fontWeight: "800",
                    letterSpacing: -0.6,
                    marginBottom: 5,
                  }}>
                    {user.fullName || "Unnamed User"}
                  </Text>
                  <View style={{
                    backgroundColor: `${C.navyMid}80`,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    alignSelf: "flex-start",
                  }}>
                    <Text style={{
                      color: C.slate,
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
                backgroundColor: `${C.navyDeep}80`,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: C.navyBorder,
                overflow: "hidden",
              }}>
                <Metric icon={Briefcase} label="Tasks Posted" value="12" position="left" />
                <View style={{ width: 1, backgroundColor: C.navyBorder }} />
                <Metric icon={Star} label="Rating" value="4.8" position="mid" />
                <View style={{ width: 1, backgroundColor: C.navyBorder }} />
                <Metric icon={Wallet} label="Total Spent" value="$1,240" position="right" />
              </View>
            </View>
          </View>
        </View>

        {/* ── Primary CTA ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Pressable
            onPress={() => router.push("/(root)/service")}
            style={({ pressed }) => ({
              backgroundColor: pressed ? C.forest : C.fern,
              borderRadius: 18,
              paddingVertical: 17,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              opacity: pressed ? 0.92 : 1,
              ...shadow.glow,
            })}
          >
            <View style={{
              width: 30,
              height: 30,
              borderRadius: 10,
              backgroundColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <PlusCircle size={17} color="white" />
            </View>
            <Text style={{
              color: C.cloud,
              fontWeight: "800",
              fontSize: 15,
              letterSpacing: 0.2,
            }}>
              Post a New Task
            </Text>
          </Pressable>
        </View>

        {/* ── Account Options ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{
            color: C.slate,
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
            backgroundColor: C.navyCard,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: C.navyBorder,
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
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Pressable
            onPress={() => signOut()}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              borderRadius: 18,
              paddingVertical: 16,
              backgroundColor: pressed ? C.redBg : C.redBg,
              borderWidth: 1.5,
              borderColor: C.redBorder,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <LogOut size={17} color={C.red} />
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
  position,
}: {
  icon: any
  label: string
  value: string
  position: "left" | "mid" | "right"
}) => (
  <View style={{
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 8,
  }}>
    <View style={{
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor: `${C.fern}18`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      borderWidth: 1,
      borderColor: `${C.fern}25`,
    }}>
      <Icon size={16} color={C.fern} />
    </View>
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
      color: C.slate,
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
      backgroundColor: pressed ? `${C.navyMid}30` : "transparent",
    })}
  >
    {/* Icon block */}
    <View style={{
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: `${C.fern}14`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      borderWidth: 1,
      borderColor: `${C.fern}22`,
    }}>
      <Icon size={18} color={C.fern} />
    </View>

    {/* Text */}
    <View style={{ flex: 1 }}>
      <Text style={{
        color: C.cloud,
        fontWeight: "700",
        fontSize: 14,
        letterSpacing: -0.2,
        marginBottom: 3,
      }}>
        {title}
      </Text>
      <Text style={{
        color: C.slate,
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
      backgroundColor: `${C.navyMid}60`,
      alignItems: "center",
      justifyContent: "center",
    }}>
      <ChevronRight size={14} color={C.navyLight} />
    </View>
  </Pressable>
)

const Divider = () => (
  <View style={{
    height: 1,
    backgroundColor: C.navyBorder,
    marginHorizontal: 20,
  }} />
)