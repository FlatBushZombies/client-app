"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"
import { getApiUrl } from "@/lib/fetch"

type ApplicationStatus = "pending" | "accepted" | "rejected"

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
}

interface ApplicationSummary {
  total: number
  pending: number
  accepted: number
  rejected: number
}

interface Job {
  id: number
  serviceType: string
  maxPrice: number
  applications: Application[]
  applicationSummary?: ApplicationSummary
}

interface ContactDraft {
  phoneNumber: string
  contactName: string
  contactInstructions: string
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
    { total: 0, pending: 0, accepted: 0, rejected: 0 }
  )
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

function StatusPill({ status }: { status: ApplicationStatus }) {
  const config = {
    accepted: { bg: "#DCFCE7", text: "#166534" },
    pending: { bg: "#FEF3C7", text: "#92400E" },
    rejected: { bg: "#FEE2E2", text: "#B91C1C" },
  }[status]

  return (
    <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: config.bg }}>
      <Text className="text-xs font-bold capitalize" style={{ color: config.text }}>
        {status}
      </Text>
    </View>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  const colors =
    tone === "green"
      ? { bg: "#ECFDF5", text: "#166534" }
      : tone === "amber"
      ? { bg: "#FFFBEB", text: "#92400E" }
      : { bg: "#EFF6FF", text: "#1D4ED8" }

  return (
    <View className="flex-1 rounded-3xl p-4" style={{ backgroundColor: colors.bg }}>
      <Text className="text-3xl font-bold" style={{ color: colors.text }}>
        {value}
      </Text>
      <Text className="mt-1 text-xs font-semibold uppercase tracking-[1px]" style={{ color: colors.text }}>
        {label}
      </Text>
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
    <View className="flex-row gap-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <TouchableOpacity key={value} onPress={() => onChange(value)}>
          <Ionicons
            name={value <= rating ? "star" : "star-outline"}
            size={20}
            color={value <= rating ? "#F59E0B" : "#CBD5E1"}
          />
        </TouchableOpacity>
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
  const [expandedContactId, setExpandedContactId] = useState<number | null>(null)
  const [sharingContactId, setSharingContactId] = useState<number | null>(null)
  const [savingMetaId, setSavingMetaId] = useState<number | null>(null)
  const [submittingReviewId, setSubmittingReviewId] = useState<number | null>(null)
  const [contactDrafts, setContactDrafts] = useState<Record<number, ContactDraft>>({})
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({})
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, ReviewDraft>>({})

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

  const ensureContactDraft = (application: Application) => {
    setContactDrafts((current) => {
      if (current[application.id]) {
        return current
      }

      return {
        ...current,
        [application.id]: {
          phoneNumber: application.contactExchange?.phoneNumber || "",
          contactName:
            application.contactExchange?.contactName || user?.fullName || user?.firstName || "",
          contactInstructions: application.contactExchange?.contactInstructions || "",
        },
      }
    })
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

  const fetchApplications = async () => {
    try {
      setError(null)
      if (!user?.id) {
        setLoading(false)
        setRefreshing(false)
        return
      }

      const token = await getToken()
      const response = await fetch(getApiUrl("/api/applications/client"), {
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
    const timer = setInterval(() => {
      fetchApplications().catch(() => undefined)
    }, 10000)

    return () => clearInterval(timer)
  }, [user?.id])

  const onRefresh = () => {
    setRefreshing(true)
    fetchApplications().catch(() => undefined)
  }

  const updateApplicationStatus = async (application: Application, status: "accepted" | "rejected") => {
    setUpdatingStatus(application.id)

    try {
      const token = await getToken()
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
        ensureContactDraft(data.data)
        ensureReviewDraft(data.data)
        setExpandedContactId(data.data.id)
      }
    } catch (statusError) {
      Alert.alert(
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
      const token = await getToken()
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
      Alert.alert(
        "Unable to save changes",
        metaError instanceof Error ? metaError.message : "Please try again."
      )
    } finally {
      setSavingMetaId(null)
    }
  }

  const shareContactDetails = async (application: Application) => {
    const draft = contactDrafts[application.id]

    if (!draft?.phoneNumber?.trim()) {
      Alert.alert("Phone number required", "Add the number the freelancer should use.")
      return
    }

    setSharingContactId(application.id)

    try {
      const token = await getToken()
      const response = await fetch(getApiUrl(`/api/applications/${application.id}/contact`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(draft),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to share contact details")
      }

      mergeUpdatedApplication(data.data)
      setExpandedContactId(null)
      Alert.alert("Direct contact unlocked", "The freelancer can now call you directly.")
    } catch (contactError) {
      Alert.alert(
        "Unable to share contact",
        contactError instanceof Error ? contactError.message : "Please try again."
      )
    } finally {
      setSharingContactId(null)
    }
  }

  const submitReview = async (application: Application) => {
    const draft = reviewDrafts[application.id]
    if (!draft?.rating) {
      Alert.alert("Rating required", "Choose a rating before saving the review.")
      return
    }

    setSubmittingReviewId(application.id)

    try {
      const token = await getToken()
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

      Alert.alert("Review saved", "Your rating has been shared with the freelancer.")
      await fetchApplications()
    } catch (reviewError) {
      Alert.alert(
        "Unable to save review",
        reviewError instanceof Error ? reviewError.message : "Please try again."
      )
    } finally {
      setSubmittingReviewId(null)
    }
  }

  const openDialer = async (phoneNumber: string | null | undefined) => {
    if (!phoneNumber) {
      return
    }

    const target = `tel:${phoneNumber}`
    const supported = await Linking.canOpenURL(target)
    if (!supported) {
      Alert.alert("Phone not supported", "This device cannot place phone calls directly.")
      return
    }

    Linking.openURL(target)
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
      <SafeAreaView className="flex-1 bg-[#F8FAFC]">
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="large" color="#0F172A" />
          <Text className="text-sm text-slate-500">Loading your hiring pipeline...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0F172A" />}
      >
        <View className="mb-5">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-4 self-start rounded-2xl bg-slate-900 px-4 py-2.5"
          >
            <Text className="font-bold text-white">Back</Text>
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-slate-950">Applications</Text>
          <Text className="mt-2 text-sm leading-6 text-slate-500">
            Accept safely, shortlist strong candidates, keep private notes, and leave reviews after the job is accepted.
          </Text>
        </View>

        {error ? (
          <View className="mb-4 rounded-3xl border border-rose-200 bg-rose-50 p-4">
            <Text className="text-sm text-rose-700">{error}</Text>
          </View>
        ) : null}

        <View className="mb-6 flex-row gap-3">
          <MetricCard label="Shortlisted" value={shortlistedCount} tone="green" />
          <MetricCard label="Accepted" value={acceptedCount} tone="blue" />
          <MetricCard label="Pending" value={pendingCount} tone="amber" />
        </View>

        {jobs.length === 0 ? (
          <View className="rounded-[28px] border border-slate-200 bg-white p-6">
            <Text className="text-lg font-bold text-slate-900">No applications yet</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500">
              When freelancers apply to your jobs, they will appear here with their reviews, quotes, and simple coordination board.
            </Text>
          </View>
        ) : null}

        {jobs.map((job) => {
          const summary = job.applicationSummary || buildSummary(job.applications)

          return (
            <View key={job.id} className="mb-6 rounded-[30px] bg-white p-5" style={{ borderWidth: 1, borderColor: "#E2E8F0" }}>
              <View className="mb-4 flex-row items-start justify-between">
                <View className="flex-1 pr-4">
                  <Text className="text-xl font-bold text-slate-950">{job.serviceType}</Text>
                  <Text className="mt-1 text-sm text-slate-500">Budget R{Number(job.maxPrice || 0).toFixed(0)}</Text>
                </View>
                <View className="rounded-2xl bg-slate-950 px-4 py-3">
                  <Text className="text-xs font-semibold uppercase tracking-[1px] text-slate-300">Applications</Text>
                  <Text className="mt-1 text-2xl font-bold text-white">{summary.total}</Text>
                </View>
              </View>

              <View className="mb-4 flex-row gap-2">
                <View className="rounded-full bg-amber-50 px-3 py-2">
                  <Text className="text-xs font-bold text-amber-700">Pending {summary.pending}</Text>
                </View>
                <View className="rounded-full bg-emerald-50 px-3 py-2">
                  <Text className="text-xs font-bold text-emerald-700">Accepted {summary.accepted}</Text>
                </View>
                <View className="rounded-full bg-slate-100 px-3 py-2">
                  <Text className="text-xs font-bold text-slate-700">Rejected {summary.rejected}</Text>
                </View>
              </View>

              {job.applications
                .slice()
                .sort((left, right) => {
                  const leftPinned = left.clientDecision?.shortlisted ? 1 : 0
                  const rightPinned = right.clientDecision?.shortlisted ? 1 : 0
                  return rightPinned - leftPinned
                })
                .map((application) => {
                  const reviewDraft = reviewDrafts[application.id] || {
                    rating: 5,
                    comment: "",
                  }
                  const noteDraft =
                    noteDrafts[application.id] ?? application.clientDecision?.privateNote ?? ""
                  const contactDraft = contactDrafts[application.id] || {
                    phoneNumber: application.contactExchange?.phoneNumber || "",
                    contactName:
                      application.contactExchange?.contactName ||
                      user?.fullName ||
                      user?.firstName ||
                      "",
                    contactInstructions: application.contactExchange?.contactInstructions || "",
                  }
                  const isPending = application.status === "pending"
                  const isAccepted = application.status === "accepted"

                  return (
                    <View
                      key={application.id}
                      className="mb-4 rounded-[28px] border border-slate-200 bg-slate-50 p-4"
                    >
                      <View className="mb-3 flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-lg font-bold text-slate-950">
                            {application.freelancerName}
                          </Text>
                          <Text className="mt-1 text-sm text-slate-500">
                            {application.freelancerEmail || "No email provided"} · Applied{" "}
                            {formatRelativeDate(application.createdAt)}
                          </Text>
                        </View>
                        <StatusPill status={application.status} />
                      </View>

                      <View className="mb-3 flex-row flex-wrap gap-2">
                        <View className="rounded-full bg-white px-3 py-2">
                          <Text className="text-xs font-bold text-slate-700">
                            {Number(application.freelancerReviewSummary?.averageRating || 0).toFixed(1)}★ ·{" "}
                            {application.freelancerReviewSummary?.reviewCount || 0} reviews
                          </Text>
                        </View>
                        {application.clientDecision?.shortlisted ? (
                          <View className="rounded-full bg-emerald-100 px-3 py-2">
                            <Text className="text-xs font-bold text-emerald-700">Shortlisted</Text>
                          </View>
                        ) : null}
                        {application.applicationSpotlight?.score ? (
                          <View className="rounded-full bg-blue-100 px-3 py-2">
                            <Text className="text-xs font-bold text-blue-700">
                              Signal {application.applicationSpotlight.score}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {application.applicationSpotlight?.summary ? (
                        <View className="mb-3 rounded-2xl bg-white p-4">
                          <Text className="text-xs font-bold uppercase tracking-[1px] text-slate-400">
                            Why this stands out
                          </Text>
                          <Text className="mt-2 text-sm leading-6 text-slate-600">
                            {application.applicationSpotlight.summary}
                          </Text>
                        </View>
                      ) : null}

                      {application.quotation ? (
                        <View className="mb-3 rounded-2xl bg-emerald-50 p-4">
                          <Text className="text-xs font-bold uppercase tracking-[1px] text-emerald-700">
                            Quotation
                          </Text>
                          <Text className="mt-2 text-base font-bold text-emerald-900">
                            {application.quotation}
                          </Text>
                        </View>
                      ) : null}

                      {application.conditions ? (
                        <View className="mb-3 rounded-2xl bg-white p-4">
                          <Text className="text-xs font-bold uppercase tracking-[1px] text-slate-400">
                            Conditions
                          </Text>
                          <Text className="mt-2 text-sm leading-6 text-slate-600">
                            {application.conditions}
                          </Text>
                        </View>
                      ) : null}

                      <View className="mb-3 rounded-2xl bg-white p-4">
                        <View className="mb-3 flex-row items-center justify-between">
                          <Text className="text-sm font-bold text-slate-900">Shortlist and notes</Text>
                          <TouchableOpacity
                            onPress={() =>
                              updateClientMeta(application, {
                                shortlisted: !application.clientDecision?.shortlisted,
                                privateNote: noteDraft,
                              })
                            }
                            className={`rounded-full px-3 py-2 ${
                              application.clientDecision?.shortlisted ? "bg-emerald-100" : "bg-slate-100"
                            }`}
                            disabled={savingMetaId === application.id}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                application.clientDecision?.shortlisted ? "text-emerald-700" : "text-slate-700"
                              }`}
                            >
                              {application.clientDecision?.shortlisted ? "Remove shortlist" : "Shortlist"}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <TextInput
                          value={noteDraft}
                          onChangeText={(value) =>
                            setNoteDrafts((current) => ({
                              ...current,
                              [application.id]: value,
                            }))
                          }
                          placeholder="Private note for this applicant"
                          placeholderTextColor="#94A3B8"
                          multiline
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                          style={{ minHeight: 86, textAlignVertical: "top" }}
                        />

                        <TouchableOpacity
                          onPress={() =>
                            updateClientMeta(application, {
                              shortlisted: application.clientDecision?.shortlisted,
                              privateNote: noteDraft,
                            })
                          }
                          className="mt-3 self-start rounded-full bg-slate-900 px-4 py-2.5"
                          disabled={savingMetaId === application.id}
                        >
                          <Text className="text-xs font-bold text-white">
                            {savingMetaId === application.id ? "Saving..." : "Save note"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {application.contactExchange?.readyForDirectContact ? (
                        <View className="mb-3 rounded-2xl bg-emerald-50 p-4">
                          <Text className="text-sm font-bold text-emerald-800">
                            Direct contact unlocked
                          </Text>
                          <Text className="mt-2 text-sm text-emerald-700">
                            {application.contactExchange.contactName || "Client"} ·{" "}
                            {application.contactExchange.phoneNumber || application.contactExchange.maskedPhoneNumber}
                          </Text>
                          {application.contactExchange.contactInstructions ? (
                            <Text className="mt-2 text-sm leading-6 text-emerald-700">
                              {application.contactExchange.contactInstructions}
                            </Text>
                          ) : null}
                          <View className="mt-3 flex-row gap-2">
                            <TouchableOpacity
                              onPress={() => setExpandedContactId(application.id)}
                              className="rounded-full bg-white px-4 py-2.5"
                            >
                              <Text className="text-xs font-bold text-emerald-700">Update contact</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => openDialer(application.contactExchange?.phoneNumber)}
                              className="rounded-full bg-emerald-700 px-4 py-2.5"
                            >
                              <Text className="text-xs font-bold text-white">Call number</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}

                      {expandedContactId === application.id ? (
                        <View className="mb-3 rounded-2xl bg-amber-50 p-4">
                          <Text className="text-sm font-bold text-amber-800">
                            Share contact details
                          </Text>
                          <TextInput
                            value={contactDraft.phoneNumber}
                            onChangeText={(value) =>
                              setContactDrafts((current) => ({
                                ...current,
                                [application.id]: {
                                  ...contactDraft,
                                  phoneNumber: value,
                                },
                              }))
                            }
                            placeholder="Phone number"
                            keyboardType="phone-pad"
                            placeholderTextColor="#B45309"
                            className="mt-3 rounded-2xl bg-white px-4 py-3 text-slate-900"
                          />
                          <TextInput
                            value={contactDraft.contactName}
                            onChangeText={(value) =>
                              setContactDrafts((current) => ({
                                ...current,
                                [application.id]: {
                                  ...contactDraft,
                                  contactName: value,
                                },
                              }))
                            }
                            placeholder="Contact name"
                            placeholderTextColor="#B45309"
                            className="mt-3 rounded-2xl bg-white px-4 py-3 text-slate-900"
                          />
                          <TextInput
                            value={contactDraft.contactInstructions}
                            onChangeText={(value) =>
                              setContactDrafts((current) => ({
                                ...current,
                                [application.id]: {
                                  ...contactDraft,
                                  contactInstructions: value,
                                },
                              }))
                            }
                            placeholder="Best time to call or extra instructions"
                            placeholderTextColor="#B45309"
                            multiline
                            className="mt-3 rounded-2xl bg-white px-4 py-3 text-slate-900"
                            style={{ minHeight: 80, textAlignVertical: "top" }}
                          />
                          <TouchableOpacity
                            onPress={() => shareContactDetails(application)}
                            className="mt-3 rounded-full bg-amber-600 px-4 py-3"
                            disabled={sharingContactId === application.id}
                          >
                            <Text className="text-center text-sm font-bold text-white">
                              {sharingContactId === application.id ? "Sharing..." : "Share contact"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {isAccepted ? (
                        <View className="mb-3 rounded-2xl bg-white p-4">
                          <Text className="text-sm font-bold text-slate-900">
                            Leave a review for this freelancer
                          </Text>
                          <Text className="mt-1 text-sm leading-6 text-slate-500">
                            Reviews stay editable, so you can update them after follow-up work too.
                          </Text>
                          <View className="mt-3">
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
                            placeholderTextColor="#94A3B8"
                            multiline
                            className="mt-3 rounded-2xl border border-slate-200 px-4 py-3 text-slate-900"
                            style={{ minHeight: 86, textAlignVertical: "top" }}
                          />
                          <TouchableOpacity
                            onPress={() => submitReview(application)}
                            className="mt-3 self-start rounded-full bg-blue-600 px-4 py-2.5"
                            disabled={submittingReviewId === application.id}
                          >
                            <Text className="text-xs font-bold text-white">
                              {submittingReviewId === application.id ? "Saving..." : "Save review"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      <View className="flex-row flex-wrap gap-2">
                        {application.conversationId ? (
                          <TouchableOpacity
                            onPress={() => openCoordinationBoard(application, job)}
                            className="rounded-full bg-slate-900 px-4 py-3"
                          >
                            <Text className="text-xs font-bold text-white">Open coordination board</Text>
                          </TouchableOpacity>
                        ) : null}

                        {isPending ? (
                          <>
                            <TouchableOpacity
                              onPress={() => updateApplicationStatus(application, "accepted")}
                              className="rounded-full bg-emerald-600 px-4 py-3"
                              disabled={updatingStatus === application.id}
                            >
                              <Text className="text-xs font-bold text-white">
                                {updatingStatus === application.id ? "Updating..." : "Accept"}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => updateApplicationStatus(application, "rejected")}
                              className="rounded-full bg-rose-100 px-4 py-3"
                              disabled={updatingStatus === application.id}
                            >
                              <Text className="text-xs font-bold text-rose-700">Reject</Text>
                            </TouchableOpacity>
                          </>
                        ) : null}

                        {isAccepted && !application.contactExchange?.readyForDirectContact ? (
                          <TouchableOpacity
                            onPress={() => {
                              ensureContactDraft(application)
                              setExpandedContactId(application.id)
                            }}
                            className="rounded-full bg-amber-100 px-4 py-3"
                          >
                            <Text className="text-xs font-bold text-amber-700">Add phone number</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  )
                })}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}
