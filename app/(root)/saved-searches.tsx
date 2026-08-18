"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@clerk/clerk-expo"
import { router } from "expo-router"
import { Bell, ChevronLeft, Trash2 } from "lucide-react-native"
import { fetchWithRetry, getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout"
import { COLORS, SHADOW } from "@/constants/theme"
import { showErrorToast, showSuccessToast, showInfoToast } from "@/lib/toast"

const CATEGORIES = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "Moving"]

interface SavedSearch {
  id: string
  category: string
  minBudget: number | null
  maxBudget: number | null
  createdAt: string
}

export default function SavedSearchesScreen() {
  const { getToken } = useAuth()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string | null>(null)
  const [minBudget, setMinBudget] = useState("")
  const [maxBudget, setMaxBudget] = useState("")
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchSearches = useCallback(async () => {
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetchWithRetry(getApiUrl("/api/user/me/saved-searches"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setSearches(data.savedSearches || [])
      }
    } catch {
      showErrorToast("Couldn't load saved searches", "Please try again.")
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchSearches()
  }, [fetchSearches])

  const addSearch = async () => {
    if (!category) {
      showInfoToast("Pick a category", "Choose what kind of specialist you want to hear about.")
      return
    }

    setSaving(true)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl("/api/user/me/saved-searches"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category,
          minBudget: minBudget.trim() ? Number(minBudget) : null,
          maxBudget: maxBudget.trim() ? Number(maxBudget) : null,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save search")
      }
      setSearches((current) => [data.savedSearch, ...current])
      setCategory(null)
      setMinBudget("")
      setMaxBudget("")
      showSuccessToast("Alert saved", "We'll notify you when a matching specialist joins.")
    } catch (error) {
      showErrorToast(
        "Couldn't save search",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setSaving(false)
    }
  }

  const removeSearch = async (id: string) => {
    setDeletingId(id)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl(`/api/user/me/saved-searches/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to remove search")
      }
      setSearches((current) => current.filter((s) => s.id !== id))
    } catch (error) {
      showErrorToast(
        "Couldn't remove search",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setDeletingId(null)
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
          Saved Searches
        </Text>
      </View>

      <FlatList
        data={searches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SCREEN_PADDING.content, paddingTop: SPACING.xs, gap: SPACING.sm }}
        ListHeaderComponent={
          <View
            style={{
              backgroundColor: COLORS.surfaceMuted,
              borderRadius: RADIUS.xl,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: COLORS.borderDashed,
              padding: SPACING.md,
              marginBottom: SPACING.md,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.primary }}>+</Text>
              <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary }}>
                New alert
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 17 }}>
              We'll notify you the moment a new specialist matching this filter joins.
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {CATEGORIES.map((c) => {
                const active = category === c
                return (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCategory(active ? null : c)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: RADIUS.pill,
                      backgroundColor: active ? COLORS.primary : COLORS.surfaceMuted,
                      borderWidth: 1,
                      borderColor: active ? COLORS.primary : COLORS.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: "PlusJakartaSans_600SemiBold",
                        color: active ? "#FFFFFF" : COLORS.textSecondary,
                      }}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TextInput
                value={minBudget}
                onChangeText={setMinBudget}
                placeholder="Min $/hr"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: RADIUS.sm,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: COLORS.textPrimary,
                }}
              />
              <TextInput
                value={maxBudget}
                onChangeText={setMaxBudget}
                placeholder="Max $/hr"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: RADIUS.sm,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 13,
                  color: COLORS.textPrimary,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={addSearch}
              disabled={saving}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: RADIUS.pill,
                paddingVertical: 12,
                alignItems: "center",
                ...SHADOW.raised,
              }}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ color: "#FFFFFF", fontFamily: "PlusJakartaSans_700Bold", fontSize: 13 }}>
                  Add Alert
                </Text>
              )}
            </TouchableOpacity>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
          ) : (
            <View style={{ alignItems: "center", paddingTop: 24, paddingHorizontal: 32 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: COLORS.accentPurpleSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bell size={26} color={COLORS.accentPurple} />
              </View>
              <Text style={{ marginTop: SPACING.sm, fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 19 }}>
                No saved searches yet. Add one above to get notified about new specialists.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.sm,
              backgroundColor: COLORS.surface,
              borderRadius: RADIUS.xl,
              padding: SPACING.md,
              ...SHADOW.card,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.accentPurpleSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={17} color={COLORS.accentPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: RADIUS.pill,
                    backgroundColor: COLORS.accentPurpleSoft,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.accentPurple }}>
                    {item.category}
                  </Text>
                </View>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: RADIUS.pill,
                    backgroundColor: COLORS.accentAmberSoft,
                  }}
                >
                  <Text style={{ fontSize: 12, fontFamily: "PlusJakartaSans_600SemiBold", color: COLORS.accentAmber }}>
                    {item.minBudget !== null || item.maxBudget !== null
                      ? `$${item.minBudget ?? "0"} – $${item.maxBudget ?? "∞"} / hr`
                      : "Any budget"}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => removeSearch(item.id)}
              disabled={deletingId === item.id}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#FEE2E2", // no soft-red token in theme.ts yet — left as literal
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color={COLORS.badgeRed} />
              ) : (
                <Trash2 size={14} color={COLORS.badgeRed} />
              )}
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
