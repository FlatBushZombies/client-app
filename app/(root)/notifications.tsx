"use client"

import { useState } from "react"
import { useSocket, type Notification } from "@/contexts/SocketContext"
import { navigateForNotificationData } from "@/lib/pushNotifications"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import {
  Platform,
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout"
import { COLORS, SHADOW } from "@/constants/theme"

type NotificationSection = {
  title: string | null
  data: Notification[]
}

const NotificationsScreen = () => {
  const {
    notifications,
    unreadCount,
    connected,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useSocket()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refreshNotifications()
    setRefreshing(false)
  }

  const formatTimeAgo = (dateString: string) => {
    const diffMs = Date.now() - new Date(dateString).getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    return new Date(dateString).toLocaleDateString()
  }

  const getNotificationIcon = (message: string) => {
    const normalized = message.toLowerCase()

    if (normalized.includes("in your area")) {
      return { name: "location" as const, gradient: ["#4ADE80", "#15803D"] as [string, string], glow: "#22C55E" }
    }

    if (normalized.includes("applied")) {
      return { name: "person-add" as const, gradient: ["#60A5FA", "#1D4ED8"] as [string, string], glow: "#3B82F6" }
    }

    if (normalized.includes("accepted")) {
      return { name: "checkmark-circle" as const, gradient: ["#34D399", "#047857"] as [string, string], glow: "#10B981" }
    }

    if (normalized.includes("rejected")) {
      return { name: "close-circle" as const, gradient: ["#F87171", "#B91C1C"] as [string, string], glow: "#EF4444" }
    }

    if (normalized.includes("phone number") || normalized.includes("contact")) {
      return { name: "call" as const, gradient: ["#38BDF8", "#0369A1"] as [string, string], glow: "#0EA5E9" }
    }

    return { name: "notifications" as const, gradient: ["#A5B4FC", "#4338CA"] as [string, string], glow: "#6366F1" }
  }

  const getNotificationCopy = (message: string) => {
    const normalized = message.toLowerCase()

    if (normalized.includes("in your area")) {
      return {
        title: "In your area",
        body: message,
      }
    }

    if (normalized.includes("accepted") && (normalized.includes("phone number") || normalized.includes("contact"))) {
      return {
        title: "Offer accepted",
        body: "The client accepted this offer and shared contact details so you can continue directly.",
      }
    }

    if (normalized.includes("accepted")) {
      return {
        title: "Offer accepted",
        body: "The client accepted this offer. Contact sharing is the next step before direct communication.",
      }
    }

    if (normalized.includes("rejected")) {
      return {
        title: "Offer rejected",
        body: "The client declined this offer, so this application will not move forward.",
      }
    }

    if (normalized.includes("phone number") || normalized.includes("contact")) {
      return {
        title: "Contact shared",
        body: "Contact details were shared for this job, so you can now follow up directly.",
      }
    }

    if (normalized.includes("applied")) {
      return {
        title: "New application update",
        body: message,
      }
    }

    return {
      title: "Notification",
      body: message,
    }
  }

  const handleNotificationPress = async (item: Notification) => {
    await markAsRead(item.id)
    if (item.conversationId || item.jobId) {
      navigateForNotificationData({
        type: item.type,
        jobId: item.jobId,
        conversationId: item.conversationId,
      })
    } else {
      router.push("/(root)/applications")
    }
  }

  const isToday = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    )
  }

  // Group into "New" (anything unread, plus today's items) and "Earlier".
  // When nothing is unread, render a single ungrouped list with no headers.
  const hasUnread = notifications.some((n) => !n.read)
  let sections: NotificationSection[]
  if (hasUnread) {
    const fresh = notifications.filter((n) => !n.read || isToday(n.createdAt))
    const earlier = notifications.filter((n) => n.read && !isToday(n.createdAt))
    sections = [{ title: "New", data: fresh }]
    if (earlier.length > 0) {
      sections.push({ title: "Earlier", data: earlier })
    }
  } else {
    sections = [{ title: null, data: notifications }]
  }

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconData = getNotificationIcon(item.message)
    const copy = getNotificationCopy(item.message)
    const showAreaBadge = item.message.toLowerCase().includes("in your area")

    return (
      <TouchableOpacity
        onPress={() => void handleNotificationPress(item)}
        activeOpacity={0.75}
        style={{
          backgroundColor: item.read ? COLORS.surface : "#FFFFFF",
          marginHorizontal: SCREEN_PADDING.content,
          marginBottom: SPACING.sm,
          borderRadius: RADIUS.xl,
          padding: SPACING.md,
          ...SHADOW.card,
          shadowOpacity: item.read ? 0.04 : 0.1,
          shadowRadius: item.read ? 12 : 18,
          elevation: item.read ? 1 : 4,
          borderWidth: 1,
          borderColor: item.read ? COLORS.borderSoft : "rgba(5,150,105,0.14)",
        }}
      >
        {!item.read && (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: SPACING.md,
              bottom: SPACING.md,
              width: 3,
              borderTopRightRadius: 3,
              borderBottomRightRadius: 3,
              backgroundColor: COLORS.primary,
            }}
          />
        )}

        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: RADIUS.md,
              marginRight: SPACING.sm,
              ...Platform.select({
                ios: {
                  shadowColor: iconData.glow,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.32,
                  shadowRadius: 10,
                },
                android: { elevation: 5 },
              }),
            }}
          >
            <LinearGradient
              colors={iconData.gradient}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{
                width: 52,
                height: 52,
                borderRadius: RADIUS.md,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.35)",
              }}
            >
              <Ionicons name={iconData.name} size={24} color="#FFFFFF" />
            </LinearGradient>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: COLORS.textPrimary,
                lineHeight: 20,
                letterSpacing: -0.2,
                marginBottom: 4,
              }}
            >
              {copy.title}
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: item.read ? "400" : "500",
                color: COLORS.textSecondary,
                lineHeight: 20,
                marginBottom: SPACING.xs,
              }}
            >
              {copy.body}
            </Text>

            {showAreaBadge ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: RADIUS.pill,
                  backgroundColor: COLORS.primarySoft,
                  marginBottom: SPACING.xs,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803D" }}>In your Area</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
              <Ionicons name="time-outline" size={14} color={COLORS.textMuted} />
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {!item.read && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: COLORS.primary,
                marginLeft: SPACING.xs,
                marginTop: 6,
              }}
            />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const renderSectionHeader = ({ section }: { section: NotificationSection }) => {
    if (!section.title) return null
    return (
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: COLORS.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginHorizontal: SCREEN_PADDING.content,
          marginTop: SPACING.xs,
          marginBottom: SPACING.sm,
        }}
      >
        {section.title}
      </Text>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: SCREEN_PADDING.content,
          paddingTop: SPACING.sm,
          paddingBottom: SPACING.md,
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.borderSoft,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.75}
          style={{
            width: 40,
            height: 40,
            borderRadius: RADIUS.sm,
            backgroundColor: COLORS.surfaceMuted,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 19, fontWeight: "800", color: COLORS.textPrimary, letterSpacing: -0.4 }}>
            Notifications
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 }}>
            {connected && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: COLORS.primary,
                }}
              />
            )}
            <Text style={{ fontSize: 12, fontWeight: "500", color: connected ? COLORS.primary : COLORS.textSecondary }}>
              {unreadCount > 0 ? `${unreadCount} unread` : connected ? "Live updates on" : "Pull to refresh"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => void markAllAsRead()}
          disabled={unreadCount === 0}
          activeOpacity={0.75}
          style={{
            opacity: unreadCount === 0 ? 0.45 : 1,
            paddingHorizontal: SPACING.sm,
            paddingVertical: 8,
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.primarySoft,
            borderWidth: 1,
            borderColor: "rgba(5,150,105,0.16)",
          }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: "700", color: COLORS.primaryDark }}>Read all</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <View
            style={{
              width: 128,
              height: 128,
              borderRadius: 40,
              marginBottom: SPACING.xl,
              ...Platform.select({
                ios: {
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 14 },
                  shadowOpacity: 0.22,
                  shadowRadius: 28,
                },
                android: { elevation: 8 },
              }),
            }}
          >
            <LinearGradient
              colors={["#ECFDF5", "#D1FAE5"]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{
                width: 128,
                height: 128,
                borderRadius: 40,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(5,150,105,0.14)",
              }}
            >
              <Ionicons name="notifications-outline" size={56} color={COLORS.primary} />
            </LinearGradient>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SPACING.xs, letterSpacing: -0.4 }}>
            No notifications yet
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.textSecondary,
              textAlign: "center",
              lineHeight: 22,
              paddingHorizontal: SPACING.lg,
            }}
          >
            You&apos;ll be notified when important application updates happen, including offers being accepted, rejected, or moved to direct contact.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderNotification}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingTop: SPACING.md, paddingBottom: SPACING.xl }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

export default NotificationsScreen
