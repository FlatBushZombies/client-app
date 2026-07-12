import { useState, useCallback, useEffect, useRef } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useUser, useAuth } from "@clerk/clerk-expo"
import { getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import * as Location from "expo-location"
import * as SecureStore from "expo-secure-store"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { uploadToCloudinary } from "@/lib/cloudinaryUpload"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  serviceType: string
  selectedServices: string[]
  startDate: string
  endDate: string
  maxPrice: string
  specialistChoice: string
  additionalInfo: string
  documents: string[]
}

interface JobTemplate {
  id: string
  name: string
  serviceType: string
  selectedServices: string[]
  startDate: string
  endDate: string
  maxPrice: number
  specialistChoice: string
  additionalInfo: string
  documents: string[]
}

interface TaskLocationState {
  loading: boolean
  label: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

type DateFieldKey = "startDate" | "endDate"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TEMPLATE_KEY_PREFIX = "client_job_templates"

function templateStorageKey(clerkId: string) {
  return `${TEMPLATE_KEY_PREFIX}:${clerkId}`
}

function hasTemplateContent(f: FormData) {
  return Boolean(
    f.serviceType.trim() || f.selectedServices.length || f.startDate ||
    f.endDate || f.maxPrice.trim() || f.specialistChoice.trim() ||
    f.additionalInfo.trim() || f.documents.length > 0
  )
}

function normalizeTemplate(t: Partial<JobTemplate>): JobTemplate {
  return {
    id: t.id || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: t.name?.trim() || t.serviceType?.trim() || "Saved template",
    serviceType: t.serviceType?.trim() || "",
    selectedServices: Array.isArray(t.selectedServices) ? t.selectedServices.filter(Boolean) : [],
    startDate: t.startDate || "",
    endDate: t.endDate || "",
    maxPrice: Number(t.maxPrice) || 0,
    specialistChoice: t.specialistChoice || "",
    additionalInfo: t.additionalInfo || "",
    documents: Array.isArray(t.documents) ? t.documents.filter(Boolean) : [],
  }
}

async function readStoredTemplates(clerkId: string): Promise<JobTemplate[]> {
  const raw = await SecureStore.getItemAsync(templateStorageKey(clerkId))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeTemplate) : []
  } catch { return [] }
}

async function writeStoredTemplates(clerkId: string, templates: JobTemplate[]) {
  await SecureStore.setItemAsync(templateStorageKey(clerkId), JSON.stringify(templates))
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDateForApi(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, "0")
  const d = `${date.getDate()}`.padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseStoredDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : startOfDay(d)
}

function formatDateLabel(value: string) {
  const d = parseStoredDate(value)
  if (!d) return "Select"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const cells: Array<{ key: string; date: Date | null }> = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push({ key: `l${i}`, date: null })
  for (let d = 1; d <= lastDay.getDate(); d++)
    cells.push({ key: `${month.getFullYear()}-${month.getMonth()}-${d}`, date: new Date(month.getFullYear(), month.getMonth(), d) })
  while (cells.length % 7 !== 0) cells.push({ key: `t${cells.length}`, date: null })
  return cells
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUICK_SERVICES = ["Plumbing", "Electrical", "Cleaning", "Carpentry", "Painting", "Moving"]

const SPECIALIST_OPTIONS = [
  { key: "Any Specialist",  desc: "We'll match you automatically",  icon: "people-outline" as const  },
  { key: "Top Rated",       desc: "Highest-reviewed professionals",  icon: "star-outline" as const    },
  { key: "Most Affordable", desc: "Best value for your budget",      icon: "pricetag-outline" as const },
]

const EMPTY_FORM: FormData = {
  serviceType: "", selectedServices: [], startDate: "", endDate: "",
  maxPrice: "", specialistChoice: "", additionalInfo: "", documents: [],
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FocusInput({
  icon, prefix, style: styleProp, ...props
}: { icon?: string; prefix?: string; style?: object; [k: string]: any }) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={[st.input, focused && st.inputFocused, styleProp]}>
      {icon && (
        <Ionicons
          name={icon as any}
          size={16}
          color={focused ? "#059669" : "#94A3B8"}
          style={{ marginRight: 8 }}
        />
      )}
      {prefix && <Text style={st.inputPrefix}>{prefix}</Text>}
      <TextInput
        style={st.inputText}
        placeholderTextColor="#94A3B8"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
    </View>
  )
}

function Divider() {
  return <View style={st.divider} />
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface PostJobModalProps {
  visible: boolean
  onClose: () => void
}

export default function PostJobModal({ visible, onClose }: PostJobModalProps) {
  const { user, isLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const submittingRef = useRef(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()))

  const [taskLocation, setTaskLocation] = useState<TaskLocationState>({
    loading: false, label: null, city: null, latitude: null, longitude: null,
  })

  const [attachmentNames, setAttachmentNames] = useState<Record<string, string>>({})
  const [uploadingCount, setUploadingCount] = useState(0)

  const update = (updates: Partial<FormData>) => setFormData((p) => ({ ...p, ...updates }))

  const addAttachment = async (
    fileUri: string,
    fileName: string,
    mimeType: string | undefined,
    resourceType: "image" | "auto"
  ) => {
    setUploadingCount((n) => n + 1)
    try {
      const uploaded = await uploadToCloudinary(fileUri, { fileName, mimeType, resourceType })
      setAttachmentNames((names) => ({ ...names, [uploaded.url]: uploaded.name }))
      setFormData((p) => ({ ...p, documents: [...p.documents, uploaded.url] }))
    } catch (e) {
      Alert.alert("Upload failed", e instanceof Error ? e.message : "Please try again.")
    } finally {
      setUploadingCount((n) => Math.max(0, n - 1))
    }
  }

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach photos.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsMultipleSelection: true,
    })
    if (result.canceled) return
    for (const asset of result.assets) {
      const fileName = asset.fileName || `photo-${Date.now()}.jpg`
      void addAttachment(asset.uri, fileName, asset.mimeType, "image")
    }
  }

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ multiple: true, type: "*/*" })
    if (result.canceled) return
    for (const asset of result.assets) {
      void addAttachment(asset.uri, asset.name, asset.mimeType, "auto")
    }
  }

  const removeAttachment = (url: string) => {
    setFormData((p) => ({ ...p, documents: p.documents.filter((d) => d !== url) }))
    setAttachmentNames((names) => {
      const next = { ...names }
      delete next[url]
      return next
    })
  }

  // ── Location ──────────────────────────────────────────────────────────────

  const syncUserLocation = useCallback(async (loc: Omit<TaskLocationState, "loading">) => {
    try {
      const token = await waitForClerkToken(getToken)
      if (!token || !user?.id) return
      await fetch(getApiUrl("/api/user/location"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ clerkId: user.id, ...loc }),
      })
    } catch {}
  }, [getToken, user?.id])

  const loadTaskLocation = useCallback(async () => {
    setTaskLocation((c) => ({ ...c, loading: true }))
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== "granted") {
        setTaskLocation({ loading: false, label: null, city: null, latitude: null, longitude: null })
        return
      }

      // Show cached location immediately so the banner never stays "Detecting…"
      const lastKnown = await Location.getLastKnownPositionAsync({})
      if (lastKnown) {
        const [rc] = await Location.reverseGeocodeAsync({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        })
        const cached = {
          label: rc?.city || rc?.district || rc?.subregion || rc?.region || "Your current area",
          city: rc?.city || rc?.district || rc?.subregion || null,
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        }
        setTaskLocation({ loading: false, ...cached })
        void syncUserLocation(cached)
      }

      // Silently refresh with accurate current position
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const [r] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      const next = {
        label: r?.city || r?.district || r?.subregion || r?.region || "Your current area",
        city: r?.city || r?.district || r?.subregion || null,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      }
      setTaskLocation({ loading: false, ...next })
      await syncUserLocation(next)
    } catch {
      // Don't wipe an already-resolved location if the refresh fails
      setTaskLocation((prev) =>
        prev.label
          ? { ...prev, loading: false }
          : { loading: false, label: null, city: null, latitude: null, longitude: null }
      )
    }
  }, [syncUserLocation])

  useEffect(() => {
    if (visible) void loadTaskLocation()
  }, [visible, loadTaskLocation])

  // ── Templates ─────────────────────────────────────────────────────────────

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) { setTemplates([]); return }
    try {
      setTemplatesLoading(true)
      setTemplates(await readStoredTemplates(user.id))
    } catch { setTemplates([]) }
    finally { setTemplatesLoading(false) }
  }, [user?.id])

  useEffect(() => {
    if (visible) void fetchTemplates()
  }, [visible, fetchTemplates])

  const applyTemplate = (t: JobTemplate) => {
    setFormData({
      serviceType: t.serviceType,
      selectedServices: t.selectedServices,
      startDate: t.startDate,
      endDate: t.endDate,
      maxPrice: String(t.maxPrice || ""),
      specialistChoice: t.specialistChoice,
      additionalInfo: t.additionalInfo,
      documents: t.documents || [],
    })
  }

  const saveCurrentTemplate = useCallback(async () => {
    Keyboard.dismiss()
    if (!user?.id) { Alert.alert("Sign in required", "Please sign in to save templates."); return }
    if (!hasTemplateContent(formData)) { Alert.alert("Nothing to save", "Fill in at least one field first."); return }
    const svcType = formData.serviceType.trim() || formData.selectedServices[0] || ""
    try {
      setSavingTemplate(true)
      const current = await readStoredTemplates(user.id)
      const next = normalizeTemplate({
        name: templateName.trim() || svcType || `Template ${current.length + 1}`,
        serviceType: svcType,
        selectedServices: formData.selectedServices,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxPrice: Number(formData.maxPrice) || 0,
        specialistChoice: formData.specialistChoice,
        additionalInfo: formData.additionalInfo,
        documents: formData.documents,
      })
      const updated = [next, ...current.filter((t) => t.id !== next.id)].slice(0, 20)
      await writeStoredTemplates(user.id, updated)
      setTemplates(updated)
      setTemplateName("")
      setShowSaveTemplate(false)
      Alert.alert("Template saved", "You can reuse this setup any time.")
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Please try again.")
    } finally { setSavingTemplate(false) }
  }, [formData, templateName, user?.id])

  const deleteTemplate = useCallback(async (id: string) => {
    if (!user?.id) return
    try {
      const current = await readStoredTemplates(user.id)
      const updated = current.filter((t) => t.id !== id)
      await writeStoredTemplates(user.id, updated)
      setTemplates(updated)
    } catch {}
  }, [user?.id])

  // ── Dates ─────────────────────────────────────────────────────────────────

  const openDatePicker = (field: DateFieldKey) => {
    Keyboard.dismiss()
    const existing = parseStoredDate(formData[field])
    const ref = existing || (field === "endDate" ? parseStoredDate(formData.startDate) : null) || startOfDay(new Date())
    setCalendarMonth(new Date(ref.getFullYear(), ref.getMonth(), 1))
    setActiveDateField(field)
  }

  const handleDateSelection = (date: Date) => {
    const norm = startOfDay(date)
    const today = startOfDay(new Date())
    if (norm < today) { Alert.alert("Pick a future date", "Choose today or a future day."); return }
    if (activeDateField === "startDate") {
      const end = parseStoredDate(formData.endDate)
      update({ startDate: formatDateForApi(norm), endDate: end && end >= norm ? formData.endDate : formatDateForApi(norm) })
    } else if (activeDateField === "endDate") {
      const start = parseStoredDate(formData.startDate)
      if (start && norm < start) { Alert.alert("Invalid end date", "Must be on or after the start date."); return }
      update({ endDate: formatDateForApi(norm) })
    }
    setActiveDateField(null)
  }

  const handleServiceToggle = (svc: string) => {
    const updated = formData.selectedServices.includes(svc)
      ? formData.selectedServices.filter((x) => x !== svc)
      : [...formData.selectedServices, svc]
    update({ selectedServices: updated, serviceType: formData.serviceType.trim() || (updated[0] ?? "") })
  }

  // ── Close / Submit ────────────────────────────────────────────────────────

  const handleClose = () => {
    onClose()
    setFormData(EMPTY_FORM)
    setShowSaveTemplate(false)
    setTemplateName("")
    setActiveDateField(null)
  }

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return
    Keyboard.dismiss()
    const svcType = formData.serviceType.trim() || formData.selectedServices[0] || ""
    if (!isLoaded || !isSignedIn || !user) { Alert.alert("Sign in required", "Please sign in first."); return }
    if (!svcType || !formData.startDate || !formData.endDate || !formData.maxPrice) {
      Alert.alert("Missing fields", "Please fill in service type, dates, and budget."); return
    }
    const s = parseStoredDate(formData.startDate)
    const e = parseStoredDate(formData.endDate)
    const today = startOfDay(new Date())
    if (!s || !e) { Alert.alert("Invalid dates", "Please pick both dates from the calendar."); return }
    if (s < today) { Alert.alert("Past start date", "Choose today or a future start date."); return }
    if (e < s) { Alert.alert("Invalid end date", "End date must be on or after start date."); return }
    submittingRef.current = true
    try {
      setLoading(true)
      const token = await waitForClerkToken(getToken)
      if (!token) throw new Error("Token missing")
      const res = await fetch(getApiUrl("/api/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          serviceType: svcType,
          selectedServices: formData.selectedServices,
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxPrice: Number(formData.maxPrice),
          specialistChoice: formData.specialistChoice,
          additionalInfo: formData.additionalInfo,
          documents: formData.documents,
          clerkId: user.id,
          userName: user.fullName || "Anonymous",
          userAvatar: user.imageUrl || null,
          location: {
            label: taskLocation.label,
            city: taskLocation.city,
            latitude: taskLocation.latitude,
            longitude: taskLocation.longitude,
          },
        }),
      })
      if (res.status === 429 || res.status === 403) {
        const body = await res.json().catch(() => ({}))
        Alert.alert("Slow down", body?.message || "Too many requests. Please wait a moment before trying again.")
        setLoading(false)
        submittingRef.current = false
        return
      }
      const result = await res.json()
      if (res.status === 201 && result?.success) {
        const count = Number(result?.matchingSummary?.nearbyFreelancerCount) || 0
        Alert.alert(
          "Task posted",
          count > 0
            ? `${count} nearby specialist${count === 1 ? "" : "s"} notified in your area.`
            : "Your task is live. Matching specialists will be notified."
        )
        handleClose()
      } else {
        Alert.alert("Error", result?.message || "Request failed.")
      }
    } catch {
      Alert.alert("Network error", "Please try again.")
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }, [formData, getToken, user, isLoaded, isSignedIn, taskLocation])

  const locationDetected = !taskLocation.loading && !!taskLocation.label

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={st.root}>

        {/* ── Header ── */}
        <View style={st.header}>
          <TouchableOpacity onPress={handleClose} style={st.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={17} color="#334155" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Post a Task</Text>
          <View style={st.closeBtn} />
        </View>

        {/* ── Location Banner ── */}
        <View style={[st.locationBanner, locationDetected && st.locationBannerDetected]}>
          {taskLocation.loading ? (
            <ActivityIndicator size="small" color="#059669" style={{ marginRight: 9 }} />
          ) : (
            <View style={[st.locationDot, locationDetected ? st.locationDotOn : st.locationDotOff]} />
          )}
          <Text style={[st.locationText, locationDetected && st.locationTextDetected]} numberOfLines={1}>
            {taskLocation.loading
              ? "Detecting your area…"
              : locationDetected
              ? `${taskLocation.label}  ·  Nearby matching on`
              : "Location unavailable · Area matching off"}
          </Text>
          {!taskLocation.loading && (
            <TouchableOpacity
              onPress={() => void loadTaskLocation()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {locationDetected
                ? <Ionicons name="checkmark-circle" size={16} color="#059669" />
                : <Ionicons name="locate-outline" size={16} color="#94A3B8" />}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Scroll body ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >

          {/* Templates compact row */}
          {(templates.length > 0 || templatesLoading) && (
            <View style={st.templatesBar}>
              <Text style={st.templatesBarLabel}>Templates</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {templatesLoading ? (
                  <ActivityIndicator size="small" color="#94A3B8" />
                ) : (
                  templates.map((t) => (
                    <View key={t.id} style={st.templateChip}>
                      <TouchableOpacity onPress={() => applyTemplate(t)} style={{ flex: 1 }}>
                        <Text style={st.templateChipText} numberOfLines={1}>{t.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void deleteTemplate(t.id)}
                        style={st.templateChipX}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="close" size={10} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          )}

          {/* ── WHAT ── */}
          <View style={st.section}>
            <Text style={st.sectionLabel}>What do you need?</Text>
            <FocusInput
              placeholder="e.g. Fix a leaking pipe"
              value={formData.serviceType}
              onChangeText={(t: string) => update({ serviceType: t })}
              icon="construct-outline"
            />
            <View style={st.chipRow}>
              {QUICK_SERVICES.map((svc) => {
                const active = formData.selectedServices.includes(svc)
                return (
                  <TouchableOpacity
                    key={svc}
                    onPress={() => handleServiceToggle(svc)}
                    activeOpacity={0.75}
                    style={[st.chip, active && st.chipActive]}
                  >
                    <Text style={[st.chipText, active && st.chipTextActive]}>{svc}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <Divider />

          {/* ── WHEN ── */}
          <View style={st.section}>
            <Text style={st.sectionLabel}>When?</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={() => openDatePicker("startDate")}
                activeOpacity={0.8}
                style={[st.dateBtn, { flex: 1 }]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={formData.startDate ? "#059669" : "#CBD5E1"}
                  style={{ marginBottom: 6 }}
                />
                <Text style={st.dateBtnLabel}>Start</Text>
                <Text style={[st.dateBtnValue, !formData.startDate && st.dateBtnPlaceholder]}>
                  {formatDateLabel(formData.startDate)}
                </Text>
              </TouchableOpacity>

              <View style={st.dateArrow}>
                <Ionicons name="arrow-forward" size={14} color="#CBD5E1" />
              </View>

              <TouchableOpacity
                onPress={() => openDatePicker("endDate")}
                activeOpacity={0.8}
                style={[st.dateBtn, { flex: 1 }]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={formData.endDate ? "#059669" : "#CBD5E1"}
                  style={{ marginBottom: 6 }}
                />
                <Text style={st.dateBtnLabel}>End</Text>
                <Text style={[st.dateBtnValue, !formData.endDate && st.dateBtnPlaceholder]}>
                  {formatDateLabel(formData.endDate)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Divider />

          {/* ── BUDGET ── */}
          <View style={st.section}>
            <Text style={st.sectionLabel}>Max budget</Text>
            <FocusInput
              placeholder="0.00"
              value={formData.maxPrice}
              onChangeText={(t: string) => update({ maxPrice: t })}
              keyboardType="numeric"
              icon="cash-outline"
              prefix="US$"
            />
          </View>

          <Divider />

          {/* ── SPECIALIST ── */}
          <View style={st.section}>
            <Text style={st.sectionLabel}>Specialist preference</Text>
            <View style={{ gap: 8 }}>
              {SPECIALIST_OPTIONS.map((opt) => {
                const active = formData.specialistChoice === opt.key
                return (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => update({ specialistChoice: opt.key })}
                    activeOpacity={0.8}
                    style={[st.optionRow, active && st.optionRowActive]}
                  >
                    <View style={[st.optionIcon, active && st.optionIconActive]}>
                      <Ionicons name={opt.icon} size={15} color={active ? "#FFFFFF" : "#94A3B8"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.optionTitle, active && st.optionTitleActive]}>{opt.key}</Text>
                      <Text style={st.optionDesc}>{opt.desc}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={18} color="#059669" />}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <Divider />

          {/* ── DETAILS ── */}
          <View style={st.section}>
            <Text style={st.sectionLabel}>Additional details</Text>
            <View style={st.textarea}>
              <TextInput
                placeholder="Share any requirements, timing constraints, or access notes…"
                placeholderTextColor="#CBD5E1"
                value={formData.additionalInfo}
                onChangeText={(t) => update({ additionalInfo: t })}
                multiline
                style={st.textareaInput}
                textAlignVertical="top"
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity onPress={pickPhoto} style={st.attachButton}>
                <Ionicons name="image-outline" size={16} color="#334155" />
                <Text style={st.attachButtonText}>Add photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickDocument} style={st.attachButton}>
                <Ionicons name="document-attach-outline" size={16} color="#334155" />
                <Text style={st.attachButtonText}>Add document</Text>
              </TouchableOpacity>
              {uploadingCount > 0 ? <ActivityIndicator size="small" color="#334155" /> : null}
            </View>

            {formData.documents.length > 0 ? (
              <View style={{ marginTop: 10, gap: 8 }}>
                {formData.documents.map((url) => (
                  <View key={url} style={st.attachmentChip}>
                    <Ionicons name="document-outline" size={14} color="#475569" />
                    <Text style={st.attachmentChipText} numberOfLines={1}>
                      {attachmentNames[url] || url.split("/").pop()}
                    </Text>
                    <TouchableOpacity onPress={() => removeAttachment(url)}>
                      <Ionicons name="close-circle" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <Divider />

          {/* ── SAVE TEMPLATE ── */}
          <View style={st.section}>
            {showSaveTemplate ? (
              <View style={{ gap: 10 }}>
                <FocusInput
                  placeholder="Template name (optional)"
                  value={templateName}
                  onChangeText={setTemplateName}
                  icon="bookmark-outline"
                />
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => { setShowSaveTemplate(false); setTemplateName("") }}
                    style={st.cancelBtn}
                  >
                    <Text style={st.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void saveCurrentTemplate()}
                    disabled={savingTemplate}
                    style={st.saveBtn}
                  >
                    {savingTemplate
                      ? <ActivityIndicator size="small" color="#FFFFFF" />
                      : <Text style={st.saveBtnText}>Save template</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setShowSaveTemplate(true)}
                style={st.saveTemplateToggle}
                activeOpacity={0.75}
              >
                <Ionicons name="bookmark-outline" size={13} color="#94A3B8" />
                <Text style={st.saveTemplateToggleText}>Save current form as template</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Footer ── */}
        <View style={st.footer}>
          <TouchableOpacity
            onPress={() => void handleSubmit()}
            disabled={loading}
            activeOpacity={0.85}
            style={st.submitBtn}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={st.submitBtnText}>Post Task</Text>
                <View style={st.submitArrow}>
                  <Ionicons name="arrow-forward" size={15} color="#059669" />
                </View>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Calendar Overlay ── */}
        {activeDateField !== null && (
          <View style={st.calOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setActiveDateField(null)}
            />
            <View style={st.calSheet}>

              <View style={st.calSheetHandle} />

              <View style={st.calHeader}>
                <View>
                  <Text style={st.calFieldLabel}>
                    {activeDateField === "startDate" ? "Start date" : "End date"}
                  </Text>
                  <Text style={st.calMonthTitle}>{monthLabel(calendarMonth)}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveDateField(null)} style={st.calCloseBtn}>
                  <Ionicons name="close" size={16} color="#334155" />
                </TouchableOpacity>
              </View>

              <View style={st.calNav}>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  style={st.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={14} color="#64748B" />
                  <Text style={st.calNavBtnText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  style={[st.calNavBtn, st.calNavBtnNext]}
                >
                  <Text style={[st.calNavBtnText, st.calNavBtnTextNext]}>Next</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={st.calDayHeaders}>
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <Text key={i} style={st.calDayHeader}>{d}</Text>
                ))}
              </View>

              <View style={st.calGrid}>
                {buildCalendarDays(calendarMonth).map((cell) => {
                  if (!cell.date) return <View key={cell.key} style={st.calCell} />
                  const norm = startOfDay(cell.date)
                  const today = startOfDay(new Date())
                  const selStart = parseStoredDate(formData.startDate)
                  const selEnd = parseStoredDate(formData.endDate)
                  const disabled =
                    norm < today ||
                    (activeDateField === "endDate" && selStart !== null && norm < selStart)
                  const selected =
                    (activeDateField === "startDate" && selStart?.getTime() === norm.getTime()) ||
                    (activeDateField === "endDate" && selEnd?.getTime() === norm.getTime())
                  return (
                    <TouchableOpacity
                      key={cell.key}
                      onPress={() => handleDateSelection(norm)}
                      disabled={disabled}
                      activeOpacity={0.75}
                      style={[st.calCell, selected && st.calCellSelected, disabled && st.calCellDisabled]}
                    >
                      <Text style={[st.calCellText, selected && st.calCellTextSelected]}>
                        {norm.getDate()}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          </View>
        )}

      </SafeAreaView>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  attachButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  attachButtonText: { fontSize: 12, fontWeight: "600", color: "#334155" },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  attachmentChipText: { flex: 1, fontSize: 13, color: "#0F172A" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#0F172A",
    letterSpacing: -0.3,
  },

  // Location banner
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 9,
  },
  locationBannerDetected: {
    backgroundColor: "#ECFDF5",
    borderBottomColor: "#D1FAE5",
  },
  locationDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
  },
  locationDotOn: { backgroundColor: "#059669" },
  locationDotOff: { backgroundColor: "#CBD5E1" },
  locationText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#94A3B8",
    flex: 1,
  },
  locationTextDetected: { color: "#059669" },

  // Scroll
  scrollContent: {
    paddingBottom: 32,
  },

  // Templates
  templatesBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 10,
  },
  templatesBarLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#94A3B8",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    gap: 6,
    maxWidth: 140,
  },
  templateChipText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#334155",
  },
  templateChipX: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Section
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#0F172A",
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: 20,
  },

  // Input
  input: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
  },
  inputFocused: {
    borderColor: "#059669",
    backgroundColor: "#FAFFFE",
  },
  inputPrefix: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#0F172A",
    marginRight: 4,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#0F172A",
    padding: 0,
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  chipText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },

  // Date
  dateBtn: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  dateBtnLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#CBD5E1",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  dateBtnValue: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#0F172A",
  },
  dateBtnPlaceholder: {
    color: "#CBD5E1",
    fontFamily: "PlusJakartaSans_400Regular",
  },
  dateArrow: {
    alignSelf: "center",
    paddingTop: 8,
  },

  // Specialist options
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  optionRowActive: {
    borderColor: "#059669",
    backgroundColor: "#FAFFFE",
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: {
    backgroundColor: "#059669",
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#0F172A",
    marginBottom: 1,
  },
  optionTitleActive: {
    color: "#047857",
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#94A3B8",
  },

  // Textarea
  textarea: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 14,
    minHeight: 96,
  },
  textareaInput: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#0F172A",
    minHeight: 72,
    padding: 0,
    lineHeight: 21,
  },

  // Save template
  saveTemplateToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  saveTemplateToggleText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#94A3B8",
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#64748B",
  },
  saveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#FFFFFF",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#059669",
    borderRadius: 30,
    paddingVertical: 15,
    paddingLeft: 24,
    paddingRight: 16,
    minWidth: 152,
    ...Platform.select({
      ios: { shadowColor: "#059669", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#FFFFFF",
    letterSpacing: 0.2,
    flex: 1,
    textAlign: "center",
  },
  submitArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Calendar overlay
  calOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    elevation: 60,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  calSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    paddingTop: 14,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.08, shadowRadius: 20 },
      android: { elevation: 12 },
    }),
  },
  calSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 18,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calFieldLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#059669",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  calMonthTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  calCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  calNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  calNavBtnNext: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A",
  },
  calNavBtnText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#64748B",
  },
  calNavBtnTextNext: {
    color: "#FFFFFF",
  },
  calDayHeaders: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calDayHeader: {
    width: "13%",
    textAlign: "center",
    fontSize: 11,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#CBD5E1",
    textTransform: "uppercase",
  },
  calGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  calCell: {
    width: "13%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    marginBottom: 4,
  },
  calCellSelected: {
    backgroundColor: "#0F172A",
  },
  calCellDisabled: {
    opacity: 0.28,
  },
  calCellText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#0F172A",
  },
  calCellTextSelected: {
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_700Bold",
  },
})
