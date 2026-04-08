"use client"

import { useEffect, useState } from "react"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native"
import { useSocket } from "@/contexts/SocketContext"
import { getApiUrl } from "@/lib/fetch"

// ─── Types ────────────────────────────────────────────────────────────────────

type ApplicationStatus = "pending" | "accepted" | "rejected"

interface ApplicationSpotlight {
  score: number
  badges: string[]
  summary: string
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (diffDays === 1) return "yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getTopSignal(job: Job) {
  return [...job.applications]
    .sort((l, r) => (r.applicationSpotlight?.score || 0) - (l.applicationSpotlight?.score || 0))
    .at(0)
}

const AVATAR_PALETTES = [
  { bg: "#1C1C2E", text: "#fff" },
  { bg: "#0A2342", text: "#fff" },
  { bg: "#1A2E1A", text: "#fff" },
  { bg: "#2E1A1A", text: "#fff" },
  { bg: "#1E1A2E", text: "#fff" },
  { bg: "#2E241A", text: "#fff" },
  { bg: "#0D2B2B", text: "#fff" },
  { bg: "#2B0D1A", text: "#fff" },
]

function avatarPalette(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length]
}

// ─── StatusPill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ApplicationStatus }) {
  const config = {
    accepted: {
      containerClass: "bg-emerald-50 border border-emerald-200",
      textClass: "text-emerald-700",
      dot: "#059669",
    },
    rejected: {
      containerClass: "bg-rose-50 border border-rose-200",
      textClass: "text-rose-600",
      dot: "#e11d48",
    },
    pending: {
      containerClass: "bg-amber-50 border border-amber-200",
      textClass: "text-amber-700",
      dot: "#d97706",
    },
  }
  const c = config[status]
  return (
    <View className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full self-start ${c.containerClass}`}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.dot }} />
      <Text className={`text-xs font-semibold capitalize tracking-wide ${c.textClass}`}>{status}</Text>
    </View>
  )
}

// ─── BadgePill ────────────────────────────────────────────────────────────────

function BadgePill({ label }: { label: string }) {
  let cls = "bg-sky-50 border border-sky-200"
  let textCls = "text-sky-700"
  if (label.includes("Budget") || label.includes("Quote")) {
    cls = "bg-emerald-50 border border-emerald-200"; textCls = "text-emerald-700"
  } else if (label.includes("Contact")) {
    cls = "bg-amber-50 border border-amber-200"; textCls = "text-amber-700"
  }
  return (
    <View className={`px-3 py-1 rounded-full ${cls}`}>
      <Text className={`text-xs font-semibold ${textCls}`}>{label}</Text>
    </View>
  )
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#059669" : score >= 50 ? "#d97706" : "#6b7280"
  return (
    <View
      className="w-12 h-12 rounded-full items-center justify-center"
      style={{ borderWidth: 2.5, borderColor: color }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color }}>{score}</Text>
    </View>
  )
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ApplicationsScreen() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { unreadCount } = useSocket()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<{
    id: number
    action: Extract<ApplicationStatus, "accepted" | "rejected">
  } | null>(null)
  const [sharingContactId, setSharingContactId] = useState<number | null>(null)
  const [expandedContactId, setExpandedContactId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [contactDrafts, setContactDrafts] = useState<Record<number, ContactDraft>>({})

  const ensureDraft = (application: Application) => {
    setContactDrafts((current) => {
      if (current[application.id]) return current
      return {
        ...current,
        [application.id]: {
          phoneNumber: application.contactExchange?.phoneNumber || "",
          contactName: application.contactExchange?.contactName || user?.fullName || user?.firstName || "",
          contactInstructions: application.contactExchange?.contactInstructions || "",
        },
      }
    })
  }

  const updateDraft = (applicationId: number, field: keyof ContactDraft, value: string) => {
    setContactDrafts((current) => ({
      ...current,
      [applicationId]: {
        phoneNumber: current[applicationId]?.phoneNumber || "",
        contactName: current[applicationId]?.contactName || "",
        contactInstructions: current[applicationId]?.contactInstructions || "",
        [field]: value,
      },
    }))
  }

  const mergeUpdatedApplication = (updatedApplication: Application) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => {
        if (job.id !== updatedApplication.jobId) return job
        const applications = job.applications.map((a) =>
          a.id === updatedApplication.id ? updatedApplication : a
        )
        return { ...job, applications, applicationSummary: buildSummary(applications) }
      })
    )
  }

  const fetchApplications = async () => {
    try {
      setError(null)
      if (!user?.id) { setLoading(false); setRefreshing(false); return }
      const token = await getToken()
      const response = await fetch(getApiUrl("/api/applications/client"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to fetch applications")
      const jobsData = (data.data || []).map((job: Job) => ({
        ...job,
        applicationSummary: job.applicationSummary || buildSummary(job.applications || []),
      }))
      setJobs(jobsData)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load applications")
      setJobs([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    const load = async () => {
      const token = await getToken()
      const response = await fetch(getApiUrl("/api/applications/client"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to fetch applications")
      const jobsData = (data.data || []).map((job: Job) => ({
        ...job,
        applicationSummary: job.applicationSummary || buildSummary(job.applications || []),
      }))
      setJobs(jobsData)
      setError(null)
      setLoading(false)
      setRefreshing(false)
    }
    load().catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load applications")
      setJobs([])
      setLoading(false)
      setRefreshing(false)
    })
    const poll = setInterval(() => load().catch(console.error), 10000)
    return () => clearInterval(poll)
  }, [getToken, user?.id])

  const onRefresh = () => { setRefreshing(true); fetchApplications() }

  const updateApplicationStatus = async (
    application: Application,
    status: Extract<ApplicationStatus, "accepted" | "rejected">
  ) => {
    setUpdatingStatus({ id: application.id, action: status })
    try {
      const token = await getToken()
      const response = await fetch(getApiUrl(`/api/applications/${application.id}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Failed to update status")
      mergeUpdatedApplication(data.data)
      if (status === "accepted") { ensureDraft(data.data); setExpandedContactId(data.data.id) }
      else setExpandedContactId((c) => (c === application.id ? null : c))
    } catch (err) {
      Alert.alert("Could not update application", err instanceof Error ? err.message : "Please try again.")
    } finally {
      setUpdatingStatus(null)
    }
  }

  const shareContactDetails = async (application: Application) => {
    const draft = contactDrafts[application.id]
    if (!draft?.phoneNumber?.trim()) {
      Alert.alert("Phone number required", "Enter the number the freelancer should use.")
      return
    }
    setSharingContactId(application.id)
    try {
      const token = await getToken()
      const response = await fetch(getApiUrl(`/api/applications/${application.id}/contact`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phoneNumber: draft.phoneNumber, contactName: draft.contactName, contactInstructions: draft.contactInstructions }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to share contact details")
      mergeUpdatedApplication(data.data)
      setExpandedContactId(null)
      Alert.alert("Direct contact unlocked", "The freelancer can now reach you directly.")
    } catch (err) {
      Alert.alert("Could not share contact", err instanceof Error ? err.message : "Please try again.")
    } finally {
      setSharingContactId(null)
    }
  }

  const openConversation = (application: Application, job: Job) => {
    if (!application.conversationId) return
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

  const openDialer = async (phoneNumber: string | null | undefined) => {
    if (!phoneNumber) return
    const target = `tel:${phoneNumber}`
    const supported = await Linking.canOpenURL(target)
    if (!supported) { Alert.alert("Phone not supported", "This device cannot place phone calls directly."); return }
    Linking.openURL(target)
  }

  // ─── Signal Deck ───────────────────────────────────────────────────────────

  const allApplications = jobs.flatMap((j) => j.applications)
  const readyToCallCount = allApplications.filter((a) => a.contactExchange?.readyForDirectContact).length
  const awaitingPhoneCount = allApplications.filter((a) => a.contactExchange?.needsClientPhoneNumber).length
  const standoutCount = allApplications.filter((a) => (a.applicationSpotlight?.score || 0) >= 75).length

  const renderSignalDeck = () => (
    <View className="px-4 pt-5 pb-2">
      <Text className="text-xs font-bold text-neutral-400 tracking-widest uppercase mb-3">
        Hire signals
      </Text>
      <View className="flex-row gap-3">
        {[
          {
            label: "Ready to call",
            value: readyToCallCount,
            icon: "call-outline" as const,
            iconColor: "#059669",
            valueClass: "text-neutral-900",
            labelClass: "text-emerald-600",
            containerClass: "bg-white border border-neutral-100",
            accentBar: "bg-emerald-500",
          },
          {
            label: "Need your number",
            value: awaitingPhoneCount,
            icon: "key-outline" as const,
            iconColor: "#d97706",
            valueClass: "text-neutral-900",
            labelClass: "text-amber-600",
            containerClass: "bg-white border border-neutral-100",
            accentBar: "bg-amber-400",
          },
          {
            label: "Standout bids",
            value: standoutCount,
            icon: "sparkles-outline" as const,
            iconColor: "#2563eb",
            valueClass: "text-neutral-900",
            labelClass: "text-blue-600",
            containerClass: "bg-white border border-neutral-100",
            accentBar: "bg-blue-500",
          },
        ].map((item) => (
          <View
            key={item.label}
            className={`flex-1 rounded-2xl p-4 overflow-hidden ${item.containerClass}`}
            style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 }}
          >
            {/* Top accent line */}
            <View className={`absolute top-0 left-0 right-0 h-0.5 ${item.accentBar}`} />
            <Ionicons name={item.icon} size={16} color={item.iconColor} />
            <Text className={`mt-3 text-3xl font-bold tracking-tight ${item.valueClass}`}>{item.value}</Text>
            <Text className={`mt-1 text-xs font-semibold leading-tight ${item.labelClass}`}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )

  // ─── Spotlight ─────────────────────────────────────────────────────────────

  const renderSpotlight = (application: Application) => {
    if (!application.applicationSpotlight) return null
    return (
      <View
        className="bg-neutral-50 rounded-2xl p-4 border border-neutral-100 mb-4"
        style={{ shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
      >
        <View className="flex-row items-start gap-3">
          <ScoreRing score={application.applicationSpotlight.score} />
          <Text className="flex-1 text-sm text-neutral-600 leading-5 mt-1">
            {application.applicationSpotlight.summary}
          </Text>
        </View>
        {(application.applicationSpotlight.badges || []).length > 0 && (
          <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-neutral-100">
            {application.applicationSpotlight.badges.map((badge) => (
              <BadgePill key={badge} label={badge} />
            ))}
          </View>
        )}
      </View>
    )
  }

  // ─── Contact Composer ──────────────────────────────────────────────────────

  const renderContactComposer = (application: Application) => {
    if (expandedContactId !== application.id) return null
    const draft = contactDrafts[application.id] || {
      phoneNumber: "",
      contactName: user?.fullName || user?.firstName || "",
      contactInstructions: "",
    }
    return (
      <View
        className="bg-amber-50 rounded-2xl p-5 border border-amber-200 mt-4"
        style={{ shadowColor: "#d97706", shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}
      >
        <View className="flex-row items-center gap-2 mb-1">
          <Ionicons name="phone-portrait-outline" size={16} color="#d97706" />
          <Text className="text-base font-bold text-amber-800">Share your contact number</Text>
        </View>
        <Text className="text-sm text-amber-700 leading-5 mb-5 opacity-80">
          This application is accepted. Add the best number for direct follow-up.
        </Text>

        <TextInput
          value={draft.phoneNumber}
          onChangeText={(v) => updateDraft(application.id, "phoneNumber", v)}
          placeholder="Phone number"
          keyboardType="phone-pad"
          placeholderTextColor="#d97706"
          className="bg-white rounded-xl border border-amber-200 px-4 py-3.5 text-neutral-900 text-base mb-3"
          style={{ fontWeight: "500" }}
        />
        <TextInput
          value={draft.contactName}
          onChangeText={(v) => updateDraft(application.id, "contactName", v)}
          placeholder="Contact name"
          placeholderTextColor="#d97706"
          className="bg-white rounded-xl border border-amber-200 px-4 py-3.5 text-neutral-900 text-base mb-3"
        />
        <TextInput
          value={draft.contactInstructions}
          onChangeText={(v) => updateDraft(application.id, "contactInstructions", v)}
          placeholder="Best time to call or extra instructions"
          placeholderTextColor="#d97706"
          multiline
          textAlignVertical="top"
          className="bg-white rounded-xl border border-amber-200 px-4 py-3.5 text-neutral-900 text-sm mb-5"
          style={{ minHeight: 88 }}
        />

        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setExpandedContactId(null)}
            className="flex-1 rounded-xl py-3.5 bg-white border border-amber-200 items-center"
          >
            <Text className="text-sm font-semibold text-amber-700">Later</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => shareContactDetails(application)}
            disabled={sharingContactId === application.id}
            className="flex-[1.3] rounded-xl py-3.5 items-center"
            style={{ backgroundColor: "#d97706" }}
          >
            {sharingContactId === application.id
              ? <ActivityIndicator color="#FFF" size="small" />
              : <Text className="text-sm font-bold text-white">Share contact</Text>}
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ─── Shared Contact ────────────────────────────────────────────────────────

  const renderSharedContact = (application: Application) => {
    if (!application.contactExchange?.readyForDirectContact) return null
    return (
      <View
        className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 mt-4"
        style={{ shadowColor: "#059669", shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } }}
      >
        <View className="flex-row items-center gap-2 mb-3">
          <View className="w-7 h-7 rounded-full bg-emerald-500 items-center justify-center">
            <Ionicons name="call" size={13} color="#fff" />
          </View>
          <Text className="text-sm font-bold text-emerald-800">Direct contact unlocked</Text>
        </View>
        <Text className="text-sm text-emerald-700 mb-1">
          {application.contactExchange.contactName || "Client"}
        </Text>
        <Text className="text-base font-bold text-emerald-900 mb-2">
          {application.contactExchange.phoneNumber || application.contactExchange.maskedPhoneNumber}
        </Text>
        {application.contactExchange.contactInstructions ? (
          <Text className="text-xs text-emerald-700 leading-5 mb-4 opacity-80">
            {application.contactExchange.contactInstructions}
          </Text>
        ) : <View className="mb-3" />}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => setExpandedContactId(application.id)}
            className="flex-1 rounded-xl py-3 bg-white border border-emerald-200 items-center"
          >
            <Text className="text-xs font-semibold text-emerald-700">Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => openDialer(application.contactExchange?.phoneNumber)}
            className="flex-1 rounded-xl py-3 bg-emerald-600 items-center"
          >
            <Text className="text-xs font-bold text-white">Call number</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ─── Application Card ──────────────────────────────────────────────────────

  const renderApplication = (application: Application, job: Job) => {
    const palette = avatarPalette(application.freelancerName)
    const isPending = application.status === "pending"
    const isAccepted = application.status === "accepted"
    const needsPhone = isAccepted && !application.contactExchange?.readyForDirectContact
    const isUpdatingThisApplication = updatingStatus?.id === application.id
    const isAcceptLoading =
      updatingStatus?.id === application.id && updatingStatus?.action === "accepted"
    const isRejectLoading =
      updatingStatus?.id === application.id && updatingStatus?.action === "rejected"

    return (
      <View
        key={application.id}
        className="bg-white rounded-3xl p-5 mb-3 border border-neutral-100"
        style={{
          shadowColor: "#000",
          shadowOpacity: 0.07,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        {/* Header */}
        <View className="flex-row items-start gap-3 mb-5">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center"
            style={{ backgroundColor: palette.bg }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: palette.text }}>
              {application.freelancerName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-neutral-900 mb-0.5">
              {application.freelancerName}
            </Text>
            <Text className="text-xs text-neutral-400 mb-1.5">
              {application.freelancerEmail || "No email provided"}
            </Text>
            <View className="flex-row items-center gap-1">
              <Ionicons name="time-outline" size={11} color="#a3a3a3" />
              <Text className="text-xs text-neutral-400">Applied {formatRelativeDate(application.createdAt)}</Text>
            </View>
          </View>
          <StatusPill status={application.status} />
        </View>

        {renderSpotlight(application)}

        {/* Quotation */}
        {application.quotation ? (
          <View className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 mb-3">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="cash-outline" size={14} color="#059669" />
              <Text className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Quotation</Text>
            </View>
            <Text className="text-base font-bold text-emerald-900">{application.quotation}</Text>
          </View>
        ) : null}

        {/* Conditions */}
        {application.conditions ? (
          <View className="bg-sky-50 rounded-2xl p-4 border border-sky-100 mb-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="document-text-outline" size={14} color="#2563eb" />
              <Text className="text-xs font-bold text-sky-700 uppercase tracking-widest">Terms & Conditions</Text>
            </View>
            <Text className="text-sm text-sky-800 leading-5">{application.conditions}</Text>
          </View>
        ) : null}

        {renderSharedContact(application)}
        {renderContactComposer(application)}

        {/* Divider */}
        <View className="h-px bg-neutral-100 mt-5 mb-4" />

        {/* Actions */}
        <View className="gap-3">
          {/* Message button */}
          <TouchableOpacity
            onPress={() => openConversation(application, job)}
            activeOpacity={0.8}
            className={`rounded-2xl py-3.5 items-center border ${
              isPending
                ? "bg-neutral-50 border-neutral-200"
                : "bg-neutral-900 border-neutral-900"
            }`}
          >
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={15}
                color={isPending ? "#737373" : "#fff"}
              />
              <Text className={`text-sm font-semibold ${isPending ? "text-neutral-500" : "text-white"}`}>
                Message Freelancer
              </Text>
            </View>
          </TouchableOpacity>

          {/* Pending actions */}
          {isPending ? (
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => updateApplicationStatus(application, "accepted")}
                disabled={isUpdatingThisApplication}
                className="flex-[2] rounded-2xl py-4 items-center bg-emerald-600"
                style={{ shadowColor: "#059669", shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
              >
                {isAcceptLoading
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text className="text-white text-sm font-bold">Accept</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => updateApplicationStatus(application, "rejected")}
                disabled={isUpdatingThisApplication}
                className="flex-1 rounded-2xl py-4 items-center bg-rose-50 border border-rose-200"
              >
                {isRejectLoading
                  ? <ActivityIndicator color="#e11d48" size="small" />
                  : <Text className="text-rose-600 text-sm font-semibold">Reject</Text>}
              </TouchableOpacity>
            </View>
          ) : needsPhone ? (
            <TouchableOpacity
              onPress={() => { ensureDraft(application); setExpandedContactId(application.id) }}
              className="rounded-2xl py-4 bg-amber-50 border border-amber-200 items-center"
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="call-outline" size={15} color="#d97706" />
                <Text className="text-sm font-bold text-amber-700">Add phone number for follow-up</Text>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    )
  }

  // ─── Job Group ─────────────────────────────────────────────────────────────

  const renderJob = ({ item: job }: { item: Job }) => {
    const topSignal = getTopSignal(job)
    const summary = job.applicationSummary || buildSummary(job.applications)

    return (
      <View className="mb-8">
        {/* Job Header */}
        <View
          className="rounded-3xl overflow-hidden mb-4"
          style={{
            backgroundColor: "#0F0F1A",
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 8 },
            elevation: 6,
          }}
        >
          {/* Subtle noise texture layer via gradient */}
          <View className="p-5">
            <View className="flex-row items-center gap-3 mb-4">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <Ionicons name="briefcase-outline" size={18} color="rgba(255,255,255,0.9)" />
              </View>
              <Text className="flex-1 text-lg font-bold text-white tracking-tight">
                {job.serviceType}
              </Text>
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-1">Budget</Text>
                <Text className="text-2xl font-bold text-white">
                  ${job.maxPrice}
                  <Text className="text-base font-normal text-white/50">/hr</Text>
                </Text>
              </View>
              <View className="flex-row gap-2">
                {[
                  { count: summary.pending, label: "pending" },
                  { count: summary.accepted, label: "accepted" },
                  { count: summary.total, label: "total" },
                ].filter((s) => s.count > 0).map((s) => (
                  <View
                    key={s.label}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <Text className="text-xs font-semibold text-white/70">
                      {s.count} {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {topSignal?.applicationSpotlight ? (
              <View
                className="rounded-2xl p-4"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}
              >
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="sparkles" size={12} color="rgba(255,255,255,0.5)" />
                  <Text className="text-xs font-bold text-white/40 uppercase tracking-widest">
                    Strongest signal
                  </Text>
                </View>
                <Text className="text-sm font-bold text-white mb-1">{topSignal.freelancerName}</Text>
                <Text className="text-xs leading-5 text-white/60">{topSignal.applicationSpotlight.summary}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {job.applications.map((app) => renderApplication(app, job))}
      </View>
    )
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center gap-4">
          <View
            className="w-16 h-16 rounded-full bg-neutral-50 border border-neutral-100 items-center justify-center"
            style={{ shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
          >
            <ActivityIndicator size="small" color="#171717" />
          </View>
          <Text className="text-sm text-neutral-400 font-medium">Loading applications…</Text>
        </View>
      </SafeAreaView>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3.5 bg-white border-b border-neutral-100"
        style={{ shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-9 h-9 rounded-xl bg-neutral-100 items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={17} color="#171717" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-neutral-900 flex-1 tracking-tight">Applications</Text>
        {unreadCount > 0 ? (
          <View className="flex-row items-center gap-1.5 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
            <View className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <Text className="text-xs font-bold text-blue-600">{unreadCount} new</Text>
          </View>
        ) : null}
      </View>

      {/* Error banner */}
      {error ? (
        <View className="mx-4 mt-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3.5 flex-row items-center gap-3">
          <Ionicons name="alert-circle-outline" size={18} color="#e11d48" />
          <Text className="flex-1 text-sm text-rose-600">{error}</Text>
          <TouchableOpacity onPress={fetchApplications} className="bg-rose-600 px-3 py-1.5 rounded-full">
            <Text className="text-xs font-bold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {renderSignalDeck()}

      {/* Empty state */}
      {jobs.length === 0 && !error ? (
        <View className="flex-1 items-center justify-center px-10">
          <View
            className="w-24 h-24 rounded-3xl bg-neutral-50 border border-neutral-100 items-center justify-center mb-6"
            style={{ shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
          >
            <Ionicons name="briefcase-outline" size={42} color="#d4d4d4" />
          </View>
          <Text className="text-xl font-bold text-neutral-900 mb-2 text-center tracking-tight">
            No applications yet
          </Text>
          <Text className="text-sm text-neutral-400 text-center leading-6">
            When freelancers apply to your jobs, you'll see their hire signals and contact handoff here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJob}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 48 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a3a3a3" />
          }
        />
      )}
    </SafeAreaView>
  )
}
