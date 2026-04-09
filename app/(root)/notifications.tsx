"use client"

import { useState } from "react"
import { useSocket } from "@/contexts/SocketContext"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

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
      return { name: "location" as const, color: "#15803D", bg: "#DCFCE7" }
    }

    if (normalized.includes("applied")) {
      return { name: "person-add" as const, color: "#3B82F6", bg: "#DBEAFE" }
    }

    if (normalized.includes("accepted")) {
      return { name: "checkmark-circle" as const, color: "#10B981", bg: "#D1FAE5" }
    }

    if (normalized.includes("rejected")) {
      return { name: "close-circle" as const, color: "#EF4444", bg: "#FEE2E2" }
    }

    if (normalized.includes("phone number") || normalized.includes("contact")) {
      return { name: "call" as const, color: "#0EA5E9", bg: "#E0F2FE" }
    }

    return { name: "notifications" as const, color: "#6366F1", bg: "#E0E7FF" }
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

  const handleNotificationPress = async (notificationId: number) => {
    await markAsRead(notificationId)
    router.push("/(root)/applications")
  }

  const renderNotification = ({ item }: { item: any }) => {
    const iconData = getNotificationIcon(item.message)
    const copy = getNotificationCopy(item.message)
    const showAreaBadge = item.message.toLowerCase().includes("in your area")

    return (
      <TouchableOpacity
        onPress={() => void handleNotificationPress(item.id)}
        activeOpacity={0.7}
        style={{
          backgroundColor: item.read ? "#FFF" : "#F8FAFC",
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 16,
          padding: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: item.read ? 0.03 : 0.08,
          shadowRadius: 8,
          elevation: item.read ? 1 : 3,
          borderWidth: 1,
          borderColor: item.read ? "#F1F5F9" : "#E2E8F0",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: iconData.bg,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={iconData.name} size={24} color={iconData.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: "#111827",
                lineHeight: 20,
                marginBottom: 4,
              }}
            >
              {copy.title}
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: item.read ? "400" : "500",
                color: "#4B5563",
                lineHeight: 20,
                marginBottom: 8,
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
                  borderRadius: 999,
                  backgroundColor: "#ECFDF5",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#15803D" }}>In your Area</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: "#6B7280" }}>{formatTimeAgo(item.createdAt)}</Text>
            </View>
          </View>

          {!item.read && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#3B82F6",
                marginLeft: 8,
                marginTop: 6,
              }}
            />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#FFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>
            Notifications
          </Text>
          <Text style={{ fontSize: 12, color: connected ? "#10B981" : "#6B7280", marginTop: 2 }}>
            {unreadCount > 0 ? `${unreadCount} unread` : connected ? "Live updates on" : "Pull to refresh"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => void markAllAsRead()}
          disabled={unreadCount === 0}
          style={{ opacity: unreadCount === 0 ? 0.5 : 1 }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#16A34A" }}>Read all</Text>
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <View
            style={{
              backgroundColor: "#F3F4F6",
              width: 120,
              height: 120,
              borderRadius: 60,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
            No notifications yet
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: "#6B7280",
              textAlign: "center",
              lineHeight: 22,
              paddingHorizontal: 20,
            }}
          >
            You&apos;ll be notified when important application updates happen, including offers being accepted, rejected, or moved to direct contact.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} />
          }
        />
      )}
    </SafeAreaView>
  )
}

export default NotificationsScreen
