"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { fetchWithRetry, getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import { RADIUS, SCREEN_PADDING, SPACING } from "@/constants/layout"
import { COLORS, SHADOW } from "@/constants/theme"
import { showSuccessToast, showErrorToast, showInfoToast } from "@/lib/toast"

const PORTFOLIO_ICON = require("../../assets/icons/portfolio.png")

type ApplicationStatus = "pending" | "accepted" | "rejected" | "completed"

interface ApplicationSpotlight {
  score: number
  badges: string[]
  summary: string
}

interface ReviewSummary {
  averageRating: number
  reviewCount: number
  latestReview?: {
    rating: number
    comment: string
    reviewerName: string
    createdAt: string
  } | null
}

interface ClientDecision {
  shortlisted: boolean
  privateNote: string
  updatedAt?: string | null
}

interface ContactExchange {
  status: "locked" | "shared" | "awaiting_client_phone"
  readyForDirectContact: boolean
  needsClientPhoneNumber: boolean
  sharedAt?: string | null
  maskedPhoneNumber?: string | null
  phoneNumber?: string | null
  contactName?: string | null
  contactInstructions?: string | null
}

interface Application {
  id: number
  jobId: number
  freelancerClerkId: string
  freelancerName: string
  freelancerEmail: string | null
  conversationId?: string
  quotation?: string | null
  conditions?: string | null
  status: ApplicationStatus
  createdAt: string
  updatedAt?: string
  applicationSpotlight?: ApplicationSpotlight
  contactExchange?: ContactExchange
  clientDecision?: ClientDecision
  freelancerReviewSummary?: ReviewSummary
  // Not sent by the API yet — backend will set this once premium
  // subscriptions exist. Kept optional so this is a no-op until then.
  freelancerIsPremium?: boolean
  distanceKm?: number | null
}

interface ApplicantStats {
  nearbyCount: number
  avgRating: number
  avgQuote: number | null
}

interface RecommendedSpecialist {
  clerkId: string
  displayName: string
  imageUrl: string | null
  skills: string | null
  distanceKm: number | null
  reviewSummary: ReviewSummary
}

interface ApplicationSummary {
  total: number
  pending: number
  accepted: number
  rejected: number
  completed: number
}

interface Job {
  id: number
  serviceType: string
  maxPrice: number
  applications: Application[]
  applicationSummary?: ApplicationSummary
  applicantStats?: ApplicantStats
}

interface ReviewDraft {
  rating: number
  comment: string
}

function buildSummary(applications: Application[]): ApplicationSummary {
  return applications.reduce(
    (summary, application) => {
      summary.total += 1
      summary[application.status] += 1
      return summary
    },
    { total: 0, pending: 0, accepted: 0, rejected: 0, completed: 0 }
  )
}

// Combined "best match" ranking: rating (0-50), spotlight quality (0-100),
// and proximity (closer scores higher, capped at 50) — blended into one
// comparable number so nearer, better-reviewed, higher-quality applicants
// surface first without any single factor dominating.
function computeCombinedScore(application: Application): number {
  const ratingScore = (application.freelancerReviewSummary?.averageRating || 0) * 10
  const spotlightScore = application.applicationSpotlight?.score || 0
  const distanceScore =
    application.distanceKm != null ? Math.max(0, 50 - application.distanceKm) : 20
  return ratingScore + spotlightScore + distanceScore
}

function formatRelativeDate(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// ─── Status tokens ──────────────────────────────────────────────────────────
// Single source of truth for per-status color/icon/label so the pill, the
// card's scan accent, and any future status-driven styling stay in sync.

const STATUS_META: Record<
  ApplicationStatus,
  { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  pending: { label: "Pending", color: "#92400E", bg: COLORS.accentAmberSoft, icon: "time-outline" },
  accepted: { label: "Accepted", color: COLORS.primaryDark, bg: COLORS.primarySoft, icon: "checkmark-circle" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2", icon: "close-circle" },
  completed: { label: "Completed", color: COLORS.info, bg: COLORS.infoSoft, icon: "checkmark-done-circle" },
}

function StatusPill({ status }: { status: ApplicationStatus }) {
  const meta = STATUS_META[status]
  return (
    <View style={[st.statusPill, { backgroundColor: meta.bg }]}>
      <Ionicons name={meta.icon} size={12} color={meta.color} />
      <Text style={[st.statusPillText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  )
}

function MetricCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string
  value: number
  tone: string
  icon: keyof typeof Ionicons.glyphMap
}) {
  const colors =
    tone === "green"
      ? { bg: COLORS.primarySoft, text: COLORS.primaryDark }
      : tone === "amber"
      ? { bg: COLORS.accentAmberSoft, text: "#92400E" }
      : { bg: COLORS.infoSoft, text: COLORS.info }

  return (
    <View style={[st.metricCard, { backgroundColor: colors.bg }]}>
      <View style={[st.metricIcon, { backgroundColor: COLORS.surface }]}>
        <Ionicons name={icon} size={15} color={colors.text} />
      </View>
      <Text style={[st.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[st.metricLabel, { color: colors.text }]}>{label}</Text>
    </View>
  )
}

function StarPicker({
  rating,
  onChange,
}: {
  rating: number
  onChange: (value: number) => void
}) {
  return (
    <View style={{ flexDirection: "row", gap: SPACING.xs }}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Pressable
          key={value}
          onPress={() => onChange(value)}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons
            name={value <= rating ? "star" : "star-outline"}
            size={22}
            color={value <= rating ? COLORS.accentAmber : COLORS.textMuted}
          />
        </Pressable>
      ))}
    </View>
  )
}

export default function ApplicationsScreen() {
  const { user } = useUser()
  const { getToken } = useAuth()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null)
  const [savingMetaId, setSavingMetaId] = useState<number | null>(null)
  const [submittingReviewId, setSubmittingReviewId] = useState<number | null>(null)
  const [expandedDetailIds, setExpandedDetailIds] = useState<Set<number>>(new Set())
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, ReviewDraft>>({})
  const [favoriteClerkIds, setFavoriteClerkIds] = useState<Set<string>>(new Set())
  const [togglingFavoriteId, setTogglingFavoriteId] = useState<string | null>(null)
  const [recommendedByJobId, setRecommendedByJobId] = useState<Record<number, RecommendedSpecialist[]>>({})
  const [loadingRecommendedJobId, setLoadingRecommendedJobId] = useState<number | null>(null)
  const [expandedRecommendedJobIds, setExpandedRecommendedJobIds] = useState<Set<number>>(new Set())
  const [messagingClerkId, setMessagingClerkId] = useState<string | null>(null)

  const toggleDetails = (applicationId: number) => {
    setExpandedDetailIds((current) => {
      const next = new Set(current)
      if (next.has(applicationId)) {
        next.delete(applicationId)
      } else {
        next.add(applicationId)
      }
      return next
    })
  }

  const mergeUpdatedApplication = (updatedApplication: Application) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => {
        if (job.id !== updatedApplication.jobId) {
          return job
        }

        const applications = job.applications.map((application) =>
          application.id === updatedApplication.id ? updatedApplication : application
        )

        return {
          ...job,
          applications,
          applicationSummary: buildSummary(applications),
        }
      })
    )
  }

  const ensureReviewDraft = (application: Application) => {
    setReviewDrafts((current) => {
      if (current[application.id]) {
        return current
      }

      return {
        ...current,
        [application.id]: {
          rating: 5,
          comment: "",
        },
      }
    })
  }

  const fetchFavorites = async () => {
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl("/api/user/me/favorites"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setFavoriteClerkIds(new Set((data.favorites || []).map((f: { clerkId: string }) => f.clerkId)))
      }
    } catch {
      // Favorites are a nice-to-have — a failed fetch just leaves the list empty.
    }
  }

  const toggleFavorite = async (freelancerClerkId: string) => {
    setTogglingFavoriteId(freelancerClerkId)
    const isFavorited = favoriteClerkIds.has(freelancerClerkId)

    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(
        getApiUrl(`/api/user/me/favorites/${freelancerClerkId}`),
        {
          method: isFavorited ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update favorite")
      }

      setFavoriteClerkIds((current) => {
        const next = new Set(current)
        if (isFavorited) {
          next.delete(freelancerClerkId)
        } else {
          next.add(freelancerClerkId)
        }
        return next
      })
      showSuccessToast(
        isFavorited ? "Removed from favorites" : "Added to favorites",
        isFavorited ? "" : "You can rehire this freelancer quickly from your Favorites list."
      )
    } catch (favoriteError) {
      showErrorToast(
        "Unable to update favorite",
        favoriteError instanceof Error ? favoriteError.message : "Please try again."
      )
    } finally {
      setTogglingFavoriteId(null)
    }
  }

  const toggleRecommendedSpecialists = async (jobId: number) => {
    setExpandedRecommendedJobIds((current) => {
      const next = new Set(current)
      if (next.has(jobId)) {
        next.delete(jobId)
      } else {
        next.add(jobId)
      }
      return next
    })

    if (recommendedByJobId[jobId]) {
      return
    }

    setLoadingRecommendedJobId(jobId)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl(`/api/jobs/${jobId}/recommended-specialists`), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setRecommendedByJobId((current) => ({ ...current, [jobId]: data.data || [] }))
      }
    } catch {
      // Recommendations are a nice-to-have — a failed fetch just leaves the panel empty.
    } finally {
      setLoadingRecommendedJobId(null)
    }
  }

  const messageSpecialist = async (specialist: RecommendedSpecialist) => {
    setMessagingClerkId(specialist.clerkId)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(
        getApiUrl(`/api/messaging/conversation-with/${specialist.clerkId}`),
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
          otherClerkId: specialist.clerkId,
          otherDisplayName: specialist.displayName,
        },
      })
    } catch (error) {
      showErrorToast(
        "Couldn't open chat",
        error instanceof Error ? error.message : "Please try again."
      )
    } finally {
      setMessagingClerkId(null)
    }
  }

  const fetchApplications = async () => {
    try {
      setError(null)
      if (!user?.id) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      const token = await waitForClerkToken(getToken)
      const response = await fetchWithRetry(getApiUrl("/api/applications/client"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to fetch applications")
      }

      const nextJobs = (data.data || []).map((job: Job) => ({
        ...job,
        applicationSummary: job.applicationSummary || buildSummary(job.applications || []),
      }))

      setJobs(nextJobs)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load applications")
      setJobs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user?.id) {
      return
    }

    fetchApplications().catch(() => undefined)
    fetchFavorites().catch(() => undefined)
    const timer = setInterval(() => {
      fetchApplications().catch(() => undefined)
    }, 10000)

    return () => clearInterval(timer)
  }, [user?.id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchApplications().catch(() => undefined)
  }

  const updateApplicationStatus = async (application: Application, status: "accepted" | "rejected" | "completed") => {
    setUpdatingStatus(application.id)

    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl(`/api/applications/${application.id}/status`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update application")
      }

      mergeUpdatedApplication(data.data)
      if (status === "accepted") {
        ensureReviewDraft(data.data)
      }
      if (status === "completed") {
        showSuccessToast("Job marked complete", "The freelancer has been notified. You can leave a review now.")
      }
    } catch (statusError) {
      showErrorToast(
        "Unable to update application",
        statusError instanceof Error ? statusError.message : "Please try again."
      )
    } finally {
      setUpdatingStatus(null)
    }
  }

  const updateClientMeta = async (application: Application, updates: Partial<ClientDecision>) => {
    setSavingMetaId(application.id)

    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl(`/api/applications/${application.id}/client-meta`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save shortlist and notes")
      }

      mergeUpdatedApplication(data.data)
      setNoteDrafts((current) => ({
        ...current,
        [application.id]: data.data.clientDecision?.privateNote || "",
      }))
    } catch (metaError) {
      showErrorToast(
        "Unable to save changes",
        metaError instanceof Error ? metaError.message : "Please try again."
      )
    } finally {
      setSavingMetaId(null)
    }
  }

  const submitReview = async (application: Application) => {
    const draft = reviewDrafts[application.id]
    if (!draft?.rating) {
      showInfoToast("Rating required", "Choose a rating before saving the review.")
      return
    }

    setSubmittingReviewId(application.id)

    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl(`/api/applications/${application.id}/reviews`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to save review")
      }

      showSuccessToast("Review saved", "Your rating has been shared with the freelancer.")
      await fetchApplications()
    } catch (reviewError) {
      showErrorToast(
        "Unable to save review",
        reviewError instanceof Error ? reviewError.message : "Please try again."
      )
    } finally {
      setSubmittingReviewId(null)
    }
  }

  const openCoordinationBoard = (application: Application, job: Job) => {
    if (!application.conversationId) {
      return
    }

    router.push({
      pathname: "/(root)/chat",
      params: {
        conversationId: application.conversationId,
        otherClerkId: application.freelancerClerkId,
        otherDisplayName: application.freelancerName,
        jobTitle: job.serviceType,
      },
    })
  }

  const allApplications = jobs.flatMap((job) => job.applications)
  const shortlistedCount = allApplications.filter((application) => application.clientDecision?.shortlisted).length
  const acceptedCount = allApplications.filter((application) => application.status === "accepted").length
  const pendingCount = allApplications.filter((application) => application.status === "pending").length

  if (loading) {
    return (
      <SafeAreaView style={st.root}>
        <View style={st.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.textPrimary} />
          <Text style={st.loadingText}>Loading your hiring pipeline...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={st.root}>
      <ScrollView
        contentContainerStyle={{ padding: SCREEN_PADDING.content, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.textPrimary} />}
      >
        <View style={{ marginBottom: SPACING.lg }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [st.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
            <Text style={st.backBtnText}>Back</Text>
          </Pressable>
          <Text style={st.pageTitle}>Applications</Text>
          <Text style={st.pageSubtitle}>
            Accept safely, shortlist strong candidates, keep private notes, and leave reviews after the job is accepted.
          </Text>
        </View>

        {error ? (
          <View style={st.errorBanner}>
            <Ionicons name="alert-circle-outline" size={16} color="#B91C1C" style={{ marginTop: 1 }} />
            <Text style={st.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        <View style={{ marginBottom: SPACING.xl, flexDirection: "row", gap: SPACING.sm }}>
          <MetricCard label="Shortlisted" value={shortlistedCount} tone="green" icon="bookmark-outline" />
          <MetricCard label="Accepted" value={acceptedCount} tone="blue" icon="checkmark-circle-outline" />
          <MetricCard label="Pending" value={pendingCount} tone="amber" icon="time-outline" />
        </View>

        {jobs.length === 0 ? (
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <Ionicons name="briefcase-outline" size={32} color={COLORS.accentPurple} />
            </View>
            <Text style={st.emptyTitle}>No applications yet</Text>
            <Text style={st.emptyBody}>
              When freelancers apply to your jobs, they will appear here with their reviews, quotes, and simple coordination board.
            </Text>
          </View>
        ) : null}

        {jobs.map((job) => {
          const summary = job.applicationSummary || buildSummary(job.applications)

          return (
            <View key={job.id} style={st.jobCard}>
              <View style={st.jobHeaderRow}>
                <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                  <Text style={st.jobTitle}>{job.serviceType}</Text>
                  <Text style={st.jobSubtitle}>Budget US${Number(job.maxPrice || 0).toFixed(0)}</Text>
                </View>
                <View style={st.jobCountBadge}>
                  <Text style={st.jobCountLabel}>Applications</Text>
                  <Text style={st.jobCountValue}>{summary.total}</Text>
                </View>
              </View>

              <View style={st.jobStatBar}>
                <View style={[st.jobStatChip, { backgroundColor: COLORS.accentAmberSoft }]}>
                  <View style={[st.jobStatDot, { backgroundColor: COLORS.accentAmber }]} />
                  <Text style={[st.jobStatText, { color: "#92400E" }]}>Pending {summary.pending}</Text>
                </View>
                <View style={[st.jobStatChip, { backgroundColor: COLORS.primarySoft }]}>
                  <View style={[st.jobStatDot, { backgroundColor: COLORS.primary }]} />
                  <Text style={[st.jobStatText, { color: COLORS.primaryDark }]}>Accepted {summary.accepted}</Text>
                </View>
                <View style={[st.jobStatChip, { backgroundColor: COLORS.surfaceMuted }]}>
                  <View style={[st.jobStatDot, { backgroundColor: COLORS.textMuted }]} />
                  <Text style={[st.jobStatText, { color: COLORS.textSecondary }]}>Rejected {summary.rejected}</Text>
                </View>
              </View>

              {job.applicantStats ? (
                <View style={st.decisionBar}>
                  <View style={st.decisionStat}>
                    <Text style={st.decisionStatValue}>{job.applicantStats.nearbyCount}</Text>
                    <Text style={st.decisionStatLabel}>Nearby (35km)</Text>
                  </View>
                  <View style={st.decisionDivider} />
                  <View style={st.decisionStat}>
                    <Text style={st.decisionStatValue}>
                      {job.applicantStats.avgRating > 0 ? job.applicantStats.avgRating.toFixed(1) : "—"}
                    </Text>
                    <Text style={st.decisionStatLabel}>Avg rating</Text>
                  </View>
                  <View style={st.decisionDivider} />
                  <View style={st.decisionStat}>
                    <Text style={st.decisionStatValue}>
                      {job.applicantStats.avgQuote != null ? `$${job.applicantStats.avgQuote.toFixed(0)}` : "—"}
                    </Text>
                    <Text style={st.decisionStatLabel}>
                      Avg quote{job.maxPrice ? ` (budget $${Number(job.maxPrice).toFixed(0)})` : ""}
                    </Text>
                  </View>
                </View>
              ) : null}

              {(() => {
                const bestMatchId =
                  job.applications.length > 1
                    ? job.applications.reduce((best, candidate) =>
                        computeCombinedScore(candidate) > computeCombinedScore(best) ? candidate : best
                      ).id
                    : null

                return job.applications
                  .slice()
                  .sort((left, right) => {
                    const leftPinned = left.clientDecision?.shortlisted ? 1 : 0
                    const rightPinned = right.clientDecision?.shortlisted ? 1 : 0
                    if (leftPinned !== rightPinned) return rightPinned - leftPinned
                    // Premium freelancers surface first, matching the "recommended
                    // first" perk — a no-op today since the field isn't sent yet.
                    const leftPremium = left.freelancerIsPremium ? 1 : 0
                    const rightPremium = right.freelancerIsPremium ? 1 : 0
                    if (leftPremium !== rightPremium) return rightPremium - leftPremium
                    return computeCombinedScore(right) - computeCombinedScore(left)
                  })
                  .map((application) => {
                  const reviewDraft = reviewDrafts[application.id] || {
                    rating: 5,
                    comment: "",
                  }
                  const noteDraft =
                    noteDrafts[application.id] ?? application.clientDecision?.privateNote ?? ""
                  const isPending = application.status === "pending"
                  const isAccepted = application.status === "accepted"
                  const isCompleted = application.status === "completed"
                  const canReview = isAccepted || isCompleted
                  const hasDetails = Boolean(
                    application.applicationSpotlight?.summary ||
                      application.quotation ||
                      application.conditions
                  )
                  const detailsExpanded = expandedDetailIds.has(application.id)
                  const statusMeta = STATUS_META[application.status]
                  const isShortlisted = Boolean(application.clientDecision?.shortlisted)
                  const isFavorited = favoriteClerkIds.has(application.freelancerClerkId)
                  const isBestMatch = bestMatchId === application.id

                  return (
                    <View key={application.id} style={st.appCard}>
                      <View style={[st.appAccentBar, { backgroundColor: statusMeta.color }]} />

                      <View style={st.appCardBody}>
                        {/* Header: name, badges, status */}
                        <View style={st.appHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <View style={st.appNameRow}>
                              <Text style={st.appName} numberOfLines={1}>
                                {application.freelancerName}
                              </Text>
                              {application.freelancerIsPremium ? (
                                <View style={st.featuredBadge}>
                                  <Ionicons name="star" size={10} color="#B45309" />
                                  <Text style={st.featuredBadgeText}>Featured</Text>
                                </View>
                              ) : null}
                              {isBestMatch ? (
                                <View style={st.bestMatchBadge}>
                                  <Ionicons name="trophy" size={10} color="#92400E" />
                                  <Text style={st.bestMatchBadgeText}>Best match</Text>
                                </View>
                              ) : null}
                              <Pressable
                                onPress={() => toggleFavorite(application.freelancerClerkId)}
                                disabled={togglingFavoriteId === application.freelancerClerkId}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                              >
                                <Ionicons
                                  name={isFavorited ? "heart" : "heart-outline"}
                                  size={18}
                                  color={isFavorited ? "#EF4444" : COLORS.textMuted}
                                />
                              </Pressable>
                            </View>
                            <Text style={st.appMeta} numberOfLines={1}>
                              {application.freelancerEmail || "No email provided"} · Applied{" "}
                              {formatRelativeDate(application.createdAt)}
                            </Text>
                          </View>
                          <StatusPill status={application.status} />
                        </View>

                        {/* Rating / shortlist / signal chips */}
                        <View style={st.chipRow}>
                          <View style={st.chipNeutral}>
                            <Ionicons name="star" size={11} color="#B45309" />
                            <Text style={st.chipNeutralText}>
                              {Number(application.freelancerReviewSummary?.averageRating || 0).toFixed(1)} ·{" "}
                              {application.freelancerReviewSummary?.reviewCount || 0} reviews
                            </Text>
                          </View>
                          {application.distanceKm != null ? (
                            <View style={st.chipNeutral}>
                              <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
                              <Text style={st.chipNeutralText}>{application.distanceKm.toFixed(1)} km away</Text>
                            </View>
                          ) : null}
                          {isShortlisted ? (
                            <View style={st.chipShortlisted}>
                              <Ionicons name="bookmark" size={11} color={COLORS.primaryDark} />
                              <Text style={st.chipShortlistedText}>Shortlisted</Text>
                            </View>
                          ) : null}
                          {application.applicationSpotlight?.score ? (
                            <View style={st.chipSignal}>
                              <Ionicons name="sparkles" size={11} color={COLORS.info} />
                              <Text style={st.chipSignalText}>
                                Signal {application.applicationSpotlight.score}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Expandable details */}
                        {hasDetails ? (
                          <Pressable
                            onPress={() => toggleDetails(application.id)}
                            style={({ pressed }) => [st.detailsToggle, { opacity: pressed ? 0.8 : 1 }]}
                          >
                            <Text style={st.detailsToggleText}>
                              {detailsExpanded ? "Hide details" : "View details"}
                            </Text>
                            <Ionicons
                              name={detailsExpanded ? "chevron-up" : "chevron-down"}
                              size={16}
                              color={COLORS.textSecondary}
                            />
                          </Pressable>
                        ) : null}

                        {hasDetails && detailsExpanded ? (
                          <View style={{ gap: SPACING.sm, marginBottom: SPACING.sm }}>
                            {application.applicationSpotlight?.summary ? (
                              <View style={st.infoCard}>
                                <Text style={st.infoCardLabel}>Why this stands out</Text>
                                <Text style={st.infoCardBody}>
                                  {application.applicationSpotlight.summary}
                                </Text>
                              </View>
                            ) : null}

                            {application.quotation ? (
                              <View style={[st.infoCard, st.quoteCard]}>
                                <Text style={[st.infoCardLabel, { color: COLORS.primaryDark }]}>Quotation</Text>
                                <Text style={st.quoteCardValue}>{application.quotation}</Text>
                              </View>
                            ) : null}

                            {application.conditions ? (
                              <View style={st.infoCard}>
                                <Text style={st.infoCardLabel}>Conditions</Text>
                                <Text style={st.infoCardBody}>{application.conditions}</Text>
                              </View>
                            ) : null}
                          </View>
                        ) : null}

                        {/* Shortlist + private notes */}
                        <View style={st.sectionCard}>
                          <View style={st.sectionCardHeader}>
                            <Text style={st.sectionCardTitle}>Shortlist and notes</Text>
                            <Pressable
                              onPress={() =>
                                updateClientMeta(application, {
                                  shortlisted: !isShortlisted,
                                  privateNote: noteDraft,
                                })
                              }
                              disabled={savingMetaId === application.id}
                              style={({ pressed }) => [
                                st.shortlistToggle,
                                isShortlisted && st.shortlistToggleActive,
                                { opacity: pressed ? 0.8 : 1 },
                              ]}
                            >
                              <Ionicons
                                name={isShortlisted ? "bookmark" : "bookmark-outline"}
                                size={14}
                                color={isShortlisted ? COLORS.primaryDark : COLORS.textSecondary}
                              />
                              <Text
                                style={[
                                  st.shortlistToggleText,
                                  isShortlisted && st.shortlistToggleTextActive,
                                ]}
                              >
                                {isShortlisted ? "Remove shortlist" : "Shortlist"}
                              </Text>
                            </Pressable>
                          </View>

                          <View style={st.hairline} />

                          <TextInput
                            value={noteDraft}
                            onChangeText={(value) =>
                              setNoteDrafts((current) => ({
                                ...current,
                                [application.id]: value,
                              }))
                            }
                            placeholder="Private note for this applicant"
                            placeholderTextColor={COLORS.textMuted}
                            multiline
                            style={st.textarea}
                          />

                          <Pressable
                            onPress={() =>
                              updateClientMeta(application, {
                                shortlisted: isShortlisted,
                                privateNote: noteDraft,
                              })
                            }
                            disabled={savingMetaId === application.id}
                            style={({ pressed }) => [st.saveNoteBtn, { opacity: pressed ? 0.85 : 1 }]}
                          >
                            <Text style={st.saveNoteBtnText}>
                              {savingMetaId === application.id ? "Saving..." : "Save note"}
                            </Text>
                          </Pressable>
                        </View>

                        {/* Private-coordination notice */}
                        {isAccepted ? (
                          <View style={st.privacyNotice}>
                            <View style={st.privacyNoticeIcon}>
                              <Ionicons name="shield-checkmark" size={16} color={COLORS.primaryDark} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={st.privacyNoticeTitle}>Phone numbers stay private</Text>
                              <Text style={st.privacyNoticeBody}>
                                Coordinate through the messages on this board — it keeps everything trackable and
                                protects the platform fee for both sides.
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        {/* Review */}
                        {canReview ? (
                          <View style={st.sectionCard}>
                            <Text style={st.sectionCardTitle}>Leave a review for this freelancer</Text>
                            <Text style={st.sectionCardHint}>
                              Reviews stay editable, so you can update them after follow-up work too.
                            </Text>
                            <View style={{ marginTop: SPACING.sm, marginBottom: SPACING.xs }}>
                              <StarPicker
                                rating={reviewDraft.rating}
                                onChange={(value) =>
                                  setReviewDrafts((current) => ({
                                    ...current,
                                    [application.id]: {
                                      ...reviewDraft,
                                      rating: value,
                                    },
                                  }))
                                }
                              />
                            </View>
                            <TextInput
                              value={reviewDraft.comment}
                              onChangeText={(value) =>
                                setReviewDrafts((current) => ({
                                  ...current,
                                  [application.id]: {
                                    ...reviewDraft,
                                    comment: value,
                                  },
                                }))
                              }
                              placeholder="How did the job go?"
                              placeholderTextColor={COLORS.textMuted}
                              multiline
                              style={[st.textarea, { marginTop: SPACING.sm }]}
                            />
                            <Pressable
                              onPress={() => submitReview(application)}
                              disabled={submittingReviewId === application.id}
                              style={({ pressed }) => [st.saveReviewBtn, { opacity: pressed ? 0.85 : 1 }]}
                            >
                              <Text style={st.saveReviewBtnText}>
                                {submittingReviewId === application.id ? "Saving..." : "Save review"}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}

                        {/* Actions */}
                        <View style={st.actionsRow}>
                          <Pressable
                            onPress={() =>
                              router.push({
                                pathname: "/(root)/specialist/[clerkId]",
                                params: {
                                  clerkId: application.freelancerClerkId,
                                  displayName: application.freelancerName,
                                },
                              })
                            }
                            style={({ pressed }) => [st.actionPortfolioWrap, { opacity: pressed ? 0.85 : 1 }]}
                          >
                            <View style={st.actionPortfolioBtn}>
                              <Image source={PORTFOLIO_ICON} style={st.actionPortfolioIcon} resizeMode="contain" />
                            </View>
                            <Text style={st.actionPortfolioLabel}>Portfolio</Text>
                          </Pressable>

                          <View style={st.actionsRowRight}>
                            {application.conversationId ? (
                              <Pressable
                                onPress={() => openCoordinationBoard(application, job)}
                                style={({ pressed }) => [
                                  st.actionCoordinate,
                                  isPending && st.actionCoordinateSecondary,
                                  { opacity: pressed ? 0.85 : 1 },
                                ]}
                              >
                                <Ionicons name="chatbubbles-outline" size={14} color={COLORS.surface} />
                                <Text style={st.actionCoordinateText}>Open coordination board</Text>
                              </Pressable>
                            ) : null}

                            {isPending ? (
                              <>
                                <Pressable
                                  onPress={() => updateApplicationStatus(application, "accepted")}
                                  disabled={updatingStatus === application.id}
                                  style={({ pressed }) => [st.actionAccept, { opacity: pressed ? 0.85 : 1 }]}
                                >
                                  <Ionicons name="checkmark-circle" size={16} color={COLORS.surface} />
                                  <Text style={st.actionAcceptText}>
                                    {updatingStatus === application.id ? "Updating..." : "Accept"}
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => updateApplicationStatus(application, "rejected")}
                                  disabled={updatingStatus === application.id}
                                  style={({ pressed }) => [st.actionReject, { opacity: pressed ? 0.85 : 1 }]}
                                >
                                  <Ionicons name="close-circle" size={16} color={COLORS.badgeRed} />
                                  <Text style={st.actionRejectText}>Reject</Text>
                                </Pressable>
                              </>
                            ) : null}

                            {isAccepted ? (
                              <Pressable
                                onPress={() => updateApplicationStatus(application, "completed")}
                                disabled={updatingStatus === application.id}
                                style={({ pressed }) => [st.actionComplete, { opacity: pressed ? 0.85 : 1 }]}
                              >
                                <Ionicons name="checkmark-done-circle" size={16} color={COLORS.info} />
                                <Text style={st.actionCompleteText}>
                                  {updatingStatus === application.id ? "Updating..." : "Mark Complete"}
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  )
                  })
              })()}

              {/* Uber-style decision support: specialists near this job who haven't applied yet */}
              <View style={st.recommendedPanel}>
                <Pressable
                  onPress={() => toggleRecommendedSpecialists(job.id)}
                  style={({ pressed }) => [st.recommendedToggle, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="compass-outline" size={16} color={COLORS.primaryDark} />
                    <Text style={st.recommendedToggleText}>Specialists near you</Text>
                  </View>
                  <Ionicons
                    name={expandedRecommendedJobIds.has(job.id) ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </Pressable>

                {expandedRecommendedJobIds.has(job.id) ? (
                  <View style={{ marginTop: SPACING.sm, gap: SPACING.sm }}>
                    {loadingRecommendedJobId === job.id ? (
                      <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.sm }} />
                    ) : (recommendedByJobId[job.id] || []).length === 0 ? (
                      <Text style={st.recommendedEmptyText}>
                        No other qualified specialists nearby right now.
                      </Text>
                    ) : (
                      (recommendedByJobId[job.id] || []).map((specialist) => (
                        <View key={specialist.clerkId} style={st.recommendedCard}>
                          <View style={{ flex: 1, paddingRight: SPACING.sm }}>
                            <Text style={st.recommendedName} numberOfLines={1}>
                              {specialist.displayName}
                            </Text>
                            <View style={st.chipRow}>
                              <View style={st.chipNeutral}>
                                <Ionicons name="star" size={11} color="#B45309" />
                                <Text style={st.chipNeutralText}>
                                  {Number(specialist.reviewSummary?.averageRating || 0).toFixed(1)} ·{" "}
                                  {specialist.reviewSummary?.reviewCount || 0} reviews
                                </Text>
                              </View>
                              {specialist.distanceKm != null ? (
                                <View style={st.chipNeutral}>
                                  <Ionicons name="location-outline" size={11} color={COLORS.textSecondary} />
                                  <Text style={st.chipNeutralText}>{specialist.distanceKm.toFixed(1)} km</Text>
                                </View>
                              ) : null}
                            </View>
                            {specialist.skills ? (
                              <Text style={st.recommendedSkills} numberOfLines={1}>
                                {specialist.skills}
                              </Text>
                            ) : null}
                          </View>
                          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                            <Pressable
                              onPress={() =>
                                router.push({
                                  pathname: "/(root)/specialist/[clerkId]",
                                  params: {
                                    clerkId: specialist.clerkId,
                                    displayName: specialist.displayName,
                                    imageUrl: specialist.imageUrl || undefined,
                                  },
                                })
                              }
                              style={({ pressed }) => [{ alignItems: "center" }, { opacity: pressed ? 0.85 : 1 }]}
                            >
                              <View style={st.recommendedPortfolioBtn}>
                                <Image source={PORTFOLIO_ICON} style={st.actionPortfolioIcon} resizeMode="contain" />
                              </View>
                              <Text style={st.actionPortfolioLabel}>Portfolio</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => messageSpecialist(specialist)}
                              disabled={messagingClerkId === specialist.clerkId}
                              style={({ pressed }) => [st.recommendedMessageBtn, { opacity: pressed ? 0.85 : 1 }]}
                            >
                              <Ionicons name="chatbubble-outline" size={16} color={COLORS.surface} />
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Header
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.xs,
    paddingLeft: SPACING.xs,
    paddingRight: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    marginTop: SPACING.xs,
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },

  // Error banner
  errorBanner: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: "#FECDD3",
    backgroundColor: "#FFF1F2",
    padding: SPACING.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#B91C1C",
  },

  // Metric cards
  metricCard: {
    flex: 1,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: "700",
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    ...SHADOW.card,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
    height: 64,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    backgroundColor: COLORS.accentPurpleSoft,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyBody: {
    marginTop: SPACING.xs,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },

  // Job card
  jobCard: {
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  jobHeaderRow: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  jobSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  jobCountBadge: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    alignItems: "center",
  },
  jobCountLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  jobCountValue: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.surface,
  },
  jobStatBar: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    gap: SPACING.xs,
  },
  jobStatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
  },
  jobStatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  jobStatText: {
    fontSize: 12,
    fontWeight: "700",
  },

  // Decision-support bar (nearby count / avg rating / avg quote vs budget)
  decisionBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceMuted,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  decisionStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  decisionStatValue: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  decisionStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  decisionDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: COLORS.border,
    marginVertical: 2,
  },

  // Best-match badge
  bestMatchBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentAmberSoft,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  bestMatchBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#92400E",
  },

  // Recommended specialists panel
  recommendedPanel: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
  },
  recommendedToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recommendedToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  recommendedEmptyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingVertical: SPACING.sm,
  },
  recommendedCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  recommendedName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  recommendedSkills: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  recommendedPortfolioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendedMessageBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Application card
  appCard: {
    marginBottom: SPACING.md,
    flexDirection: "row",
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...SHADOW.card,
  },
  appAccentBar: {
    width: 4,
  },
  appCardBody: {
    flex: 1,
    padding: SPACING.md,
  },
  appHeaderRow: {
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  appNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  appName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  appMeta: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.accentAmberSoft,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: "#B45309",
  },

  // Chip row
  chipRow: {
    marginBottom: SPACING.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.xs,
  },
  chipNeutral: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  chipNeutralText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  chipShortlisted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  chipShortlistedText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  chipSignal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.infoSoft,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  chipSignalText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.info,
  },

  // Status pill
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Details toggle
  detailsToggle: {
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  detailsToggleText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textSecondary,
  },

  // Info / quote cards (expanded details)
  infoCard: {
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: COLORS.textMuted,
  },
  infoCardBody: {
    marginTop: SPACING.xs,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  quoteCard: {
    backgroundColor: COLORS.primarySoft,
    borderColor: "#D1FAE5",
  },
  quoteCardValue: {
    marginTop: SPACING.xs,
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },

  // Generic section card (notes / review)
  sectionCard: {
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  sectionCardHeader: {
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionCardHint: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  hairline: {
    marginBottom: SPACING.sm,
    height: 1,
    backgroundColor: COLORS.borderSoft,
  },
  textarea: {
    minHeight: 86,
    textAlignVertical: "top",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  shortlistToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  shortlistToggleActive: {
    backgroundColor: COLORS.primarySoft,
  },
  shortlistToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  shortlistToggleTextActive: {
    color: COLORS.primaryDark,
  },

  saveNoteBtn: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.textPrimary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  saveNoteBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.surface,
  },

  saveReviewBtn: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.info,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  saveReviewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.surface,
  },

  // Privacy notice
  privacyNotice: {
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  privacyNoticeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  privacyNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  privacyNoticeBody: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  actionsRowRight: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: SPACING.xs,
  },
  actionPortfolioWrap: {
    alignItems: "center",
  },
  actionPortfolioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionPortfolioIcon: {
    width: 20,
    height: 20,
  },
  actionPortfolioLabel: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  actionCoordinate: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    ...SHADOW.raised,
  },
  // Applied when Accept/Reject are also visible in the row, so only one
  // pill reads as "the" primary action at a time.
  actionCoordinateSecondary: {
    backgroundColor: COLORS.textPrimary,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionCoordinateText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.surface,
  },
  actionAccept: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
    ...SHADOW.raised,
  },
  actionAcceptText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.surface,
  },
  actionReject: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
  },
  actionRejectText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.badgeRed,
  },
  actionComplete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.infoSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 1,
  },
  actionCompleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.info,
  },
})
