"use client"

import { useCallback, useEffect, useState } from "react"
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "@clerk/clerk-expo"
import { router } from "expo-router"
import { Briefcase, CheckCircle2, ChevronLeft, Clock, DollarSign } from "lucide-react-native"
import { fetchWithRetry, getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout"
import { COLORS, SHADOW } from "@/constants/theme"
import { showErrorToast } from "@/lib/toast"

interface ClientAnalytics {
  totalJobsPosted: number
  completedJobsCount: number
  totalCommittedSpend: number
  averageResponseTimeHours: number | null
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
}: {
  icon: any
  iconBg: string
  iconColor: string
  label: string
  value: string
}) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.xl,
        padding: SPACING.lg,
        ...SHADOW.card,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: RADIUS.pill,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Icon size={17} color={iconColor} />
      </View>
      <Text style={{ fontSize: 24, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 3 }}>{label}</Text>
    </View>
  )
}

export default function AnalyticsScreen() {
  const { getToken } = useAuth()
  const [analytics, setAnalytics] = useState<ClientAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAnalytics = useCallback(async () => {
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetchWithRetry(getApiUrl("/api/user/me/analytics"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setAnalytics(data.analytics)
      } else {
        throw new Error(data.message || "Failed to load analytics")
      }
    } catch {
      showErrorToast("Couldn't load analytics", "Please try again.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

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
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
            ...SHADOW.card,
          }}
        >
          <ChevronLeft size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary }}>
          Analytics
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: SCREEN_PADDING.content, paddingTop: SPACING.xs }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                fetchAnalytics()
              }}
            />
          }
        >
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            <StatCard
              icon={Briefcase}
              iconBg={COLORS.primarySoft}
              iconColor={COLORS.primary}
              label="Jobs posted"
              value={String(analytics?.totalJobsPosted ?? 0)}
            />
            <StatCard
              icon={CheckCircle2}
              iconBg={COLORS.infoSoft}
              iconColor={COLORS.info}
              label="Jobs completed"
              value={String(analytics?.completedJobsCount ?? 0)}
            />
            <StatCard
              icon={DollarSign}
              iconBg={COLORS.accentAmberSoft}
              iconColor={COLORS.accentAmber}
              label="Committed spend"
              value={`$${(analytics?.totalCommittedSpend ?? 0).toLocaleString()}`}
            />
            <StatCard
              icon={Clock}
              iconBg={COLORS.accentPurpleSoft}
              iconColor={COLORS.accentPurple}
              label="Avg. response time"
              value={
                analytics?.averageResponseTimeHours != null
                  ? `${analytics.averageResponseTimeHours}h`
                  : "—"
              }
            />
          </View>

          <View
            style={{
              marginTop: SPACING.md,
              backgroundColor: COLORS.surfaceMuted,
              borderRadius: RADIUS.xl,
              padding: SPACING.md,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 }}>
              Committed spend is estimated from quotations on accepted and completed jobs —
              QuickHands doesn't process payments directly, so treat this as a guide rather than
              an exact figure.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
