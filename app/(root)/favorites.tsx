"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@clerk/clerk-expo"
import { router } from "expo-router"
import { ChevronLeft, Heart, MessageCircle } from "lucide-react-native"
import { getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout"
import { COLORS, SHADOW } from "@/constants/theme"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

interface FavoriteFreelancer {
  clerkId: string
  displayName: string
  imageUrl: string | null
  skills: string | null
  reviewSummary?: {
    averageRating: number
    reviewCount: number
  }
}

export default function FavoritesScreen() {
  const { getToken } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteFreelancer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [messagingId, setMessagingId] = useState<string | null>(null)

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl("/api/user/me/favorites"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setFavorites(data.favorites || [])
      }
    } catch {
      showErrorToast("Couldn't load favorites", "Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const removeFavorite = async (freelancerClerkId: string) => {
    setRemovingId(freelancerClerkId)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(
        getApiUrl(`/api/user/me/favorites/${freelancerClerkId}`),
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove favorite")
      }
      setFavorites((current) => current.filter((f) => f.clerkId !== freelancerClerkId))
      showSuccessToast("Removed", "Freelancer removed from favorites.")
    } catch (error) {
      showErrorToast(
        "Couldn't remove favorite",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setRemovingId(null)
    }
  }

  const openConversation = async (freelancerClerkId: string, displayName: string) => {
    setMessagingId(freelancerClerkId)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(
        getApiUrl(`/api/messaging/conversation-with/${freelancerClerkId}`),
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to open conversation")
      }
      router.push({
        pathname: "/(root)/chat",
        params: {
          conversationId: data.conversationId,
          otherClerkId: freelancerClerkId,
          otherDisplayName: displayName,
        },
      })
    } catch (error) {
      showErrorToast(
        "Couldn't open chat",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setMessagingId(null)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: SCREEN_PADDING.content,
          paddingBottom: SPACING.md,
          gap: SPACING.sm,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: COLORS.surface,
            alignItems: "center",
            justifyContent: "center",
            ...SHADOW.card,
          }}
        >
          <ChevronLeft size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary }}>
          Favorites
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.clerkId}
          contentContainerStyle={{ padding: SCREEN_PADDING.content, paddingTop: SPACING.xs, gap: SPACING.sm }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchFavorites()
              }}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 64, paddingHorizontal: 32 }}>
              <Heart size={32} color={COLORS.textMuted} />
              <Text style={{ marginTop: 12, fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary }}>
                No favorites yet
              </Text>
              <Text style={{ marginTop: 4, fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 19 }}>
                Tap the heart on a freelancer in your Tasks to save them here for next time.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: SPACING.sm,
                backgroundColor: COLORS.surface,
                borderRadius: RADIUS.lg,
                padding: SPACING.sm,
                ...SHADOW.card,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: COLORS.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontFamily: "PlusJakartaSans_700Bold", color: COLORS.primaryDark, fontSize: 15 }}>
                  {item.displayName?.[0]?.toUpperCase() || "?"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary }} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>
                  {item.skills || "No skills listed"}
                  {item.reviewSummary && item.reviewSummary.reviewCount > 0
                    ? `  ·  ${item.reviewSummary.averageRating.toFixed(1)}★`
                    : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => openConversation(item.clerkId, item.displayName)}
                disabled={messagingId === item.clerkId}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.primarySoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {messagingId === item.clerkId ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MessageCircle size={16} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeFavorite(item.clerkId)}
                disabled={removingId === item.clerkId}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: "#FEE2E2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Heart size={16} color="#EF4444" fill="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}
