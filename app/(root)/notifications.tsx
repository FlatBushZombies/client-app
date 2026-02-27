"use client"

import { useSocket } from "@/contexts/SocketContext"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { useEffect } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native"

const NotificationsScreen = () => {
  const { notifications, unreadCount, refreshNotifications, markAsRead } = useSocket()
  const [refreshing, setRefreshing] = React.useState(false)

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
    if (message.includes("applied")) return { name: "person-add" as const, color: "#3B82F6", bg: "#DBEAFE" }
    if (message.includes("accepted")) return { name: "checkmark-circle" as const, color: "#10B981", bg: "#D1FAE5" }
    if (message.includes("rejected")) return { name: "close-circle" as const, color: "#EF4444", bg: "#FEE2E2" }
    return { name: "notifications" as const, color: "#6366F1", bg: "#E0E7FF" }
  }

  const renderNotification = ({ item }: { item: any }) => {
    const iconData = getNotificationIcon(item.message)

    return (
      <TouchableOpacity
        onPress={() => {
          markAsRead(item.id)
          router.push("/(root)/applications")
        }}
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
          {/* Icon */}
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

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: item.read ? "400" : "600",
                color: "#111827",
                lineHeight: 21,
                marginBottom: 6,
              }}
            >
              {item.message}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="time-outline" size={14} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: "#6B7280" }}>
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>

          {/* Unread indicator */}
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
      {/* Header */}
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
          {unreadCount > 0 && (
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
              {unreadCount} unread
            </Text>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* List */}
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
            You'll be notified when freelancers{"\n"}apply to your jobs
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
