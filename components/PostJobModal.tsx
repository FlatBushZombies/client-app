import { useState, useCallback, useEffect, useRef } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Animated,
  Easing,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useUser, useAuth } from "@clerk/clerk-expo"
import { fetchWithRetry, getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import * as Location from "expo-location"
import * as SecureStore from "expo-secure-store"
import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import { uploadToCloudinary } from "@/lib/cloudinaryUpload"
import { COLORS, SHADOW } from "@/constants/theme"
import { RADIUS, SPACING } from "@/constants/layout"
import { showSuccessToast, showErrorToast, showInfoToast } from "@/lib/toast"

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

// Rotating pastel icon-badge trio for option cards (visual variety only —
// the active/selected state always overrides to the brand primary colors).
const OPTION_ACCENTS = [
  { soft: COLORS.accentGreenSoft, strong: COLORS.accentGreen },
  { soft: COLORS.accentPurpleSoft, strong: COLORS.accentPurple },
  { soft: COLORS.accentAmberSoft, strong: COLORS.accentAmber },
]

const EMPTY_FORM: FormData = {
  serviceType: "", selectedServices: [], startDate: "", endDate: "",
  maxPrice: "", specialistChoice: "", additionalInfo: "", documents: [],
}

const TOTAL_STEPS = 5

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
          color={focused ? COLORS.primary : COLORS.textMuted}
          style={{ marginRight: 8 }}
        />
      )}
      {prefix && <Text style={st.inputPrefix}>{prefix}</Text>}
      <TextInput
        style={st.inputText}
        placeholderTextColor={COLORS.textMuted}
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

function SuccessScreen({
  serviceType,
  matchedCount,
  onPostAnother,
  onDone,
}: {
  serviceType: string
  matchedCount: number
  onPostAnother: () => void
  onDone: () => void
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const opacityAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.View style={{ flex: 1, opacity: opacityAnim, alignItems: "center", justifyContent: "center", padding: 32 }}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          width: 96,
          height: 96,
          borderRadius: 48,
          backgroundColor: COLORS.primarySoft,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
          ...SHADOW.raised,
        }}
      >
        <Ionicons name="checkmark-circle" size={56} color={COLORS.primary} />
      </Animated.View>

      <Text style={{ fontSize: 26, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.textPrimary, textAlign: "center", marginBottom: 8 }}>
        Task Posted!
      </Text>
      <Text style={{ fontSize: 15, fontFamily: "PlusJakartaSans_500Medium", color: COLORS.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 8 }}>
        Your request for
      </Text>
      <View style={{ backgroundColor: COLORS.primarySoft, borderRadius: RADIUS.lg, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24, maxWidth: "100%" }}>
        <Text style={{ fontSize: 14, fontFamily: "PlusJakartaSans_700Bold", color: COLORS.primaryDark, textAlign: "center" }} numberOfLines={2}>
          {serviceType}
        </Text>
      </View>

      <View style={{ width: "100%", backgroundColor: COLORS.surfaceMuted, borderRadius: RADIUS.xl, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card }}>
        <Text style={{ fontSize: 13, fontFamily: "PlusJakartaSans_500Medium", color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 }}>
          {matchedCount > 0
            ? `🔔 ${matchedCount} nearby specialist${matchedCount === 1 ? "" : "s"} notified. You'll be alerted here as they respond.`
            : "🔔 Your task is live. Matching specialists will be notified as they become available."}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onDone}
        activeOpacity={0.85}
        style={{
          width: "100%",
          backgroundColor: COLORS.primary,
          borderRadius: RADIUS.pill,
          paddingVertical: SPACING.md,
          alignItems: "center",
          marginBottom: 12,
          ...SHADOW.raised,
          shadowColor: COLORS.primary,
          shadowOpacity: 0.4,
        }}
      >
        <Text style={{ color: "#FFFFFF", fontFamily: "PlusJakartaSans_700Bold", fontSize: 16 }}>Done</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onPostAnother}
        activeOpacity={0.7}
        style={{
          width: "100%",
          borderWidth: 1.5,
          borderColor: COLORS.border,
          borderRadius: RADIUS.pill,
          paddingVertical: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ color: COLORS.textSecondary, fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 15 }}>Post Another Task</Text>
      </TouchableOpacity>
    </Animated.View>
  )
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
  const [successInfo, setSuccessInfo] = useState<{ serviceType: string; matchedCount: number } | null>(null)
  const [loading, setLoading] = useState(false)
  // Posting can take up to 45s if the backend's free-tier host is waking
  // from a cold start (see handleSubmit's fetch timeout). A bare spinner
  // for that long reads as a frozen app, so this surfaces a reassuring
  // hint once the wait actually gets long instead of the whole time.
  const [showSlowHint, setShowSlowHint] = useState(false)
  const submittingRef = useRef(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()))

  const [currentStep, setCurrentStep] = useState<number>(0)
  const stepFade = useRef(new Animated.Value(1)).current
  const stepAnimatingRef = useRef(false)

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
      showErrorToast("Upload failed", e instanceof Error ? e.message : "Please try again.")
    } finally {
      setUploadingCount((n) => Math.max(0, n - 1))
    }
  }

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      showInfoToast("Permission needed", "Allow photo library access to attach photos.")
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

  // Guarded on the visible-transition-to-true edge, not on [visible,
  // loadTaskLocation] directly — loadTaskLocation is only as stable as
  // Clerk's getToken reference, and if that isn't memoized across renders
  // this would refire on every render while the modal is open (repeatedly
  // hitting native location APIs + setState in a tight loop instead of once
  // per open — a real crash/flicker risk on production builds).
  const prevVisibleForLocationRef = useRef(false)
  useEffect(() => {
    if (visible && !prevVisibleForLocationRef.current) {
      void loadTaskLocation()
    }
    prevVisibleForLocationRef.current = visible
  }, [visible])

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
    if (!user?.id) { showInfoToast("Sign in required", "Please sign in to save templates."); return }
    if (!hasTemplateContent(formData)) { showInfoToast("Nothing to save", "Fill in at least one field first."); return }
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
      showSuccessToast("Template saved", "You can reuse this setup any time.")
    } catch (e) {
      showErrorToast("Error", e instanceof Error ? e.message : "Please try again.")
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
    if (norm < today) { showInfoToast("Pick a future date", "Choose today or a future day."); return }
    if (activeDateField === "startDate") {
      const end = parseStoredDate(formData.endDate)
      update({ startDate: formatDateForApi(norm), endDate: end && end >= norm ? formData.endDate : formatDateForApi(norm) })
    } else if (activeDateField === "endDate") {
      const start = parseStoredDate(formData.startDate)
      if (start && norm < start) { showInfoToast("Invalid end date", "Must be on or after the start date."); return }
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

  // ── Wizard navigation ─────────────────────────────────────────────────────

  const goToStep = (next: number) => {
    if (stepAnimatingRef.current || next === currentStep || next < 0 || next > TOTAL_STEPS - 1) return
    stepAnimatingRef.current = true
    Keyboard.dismiss()
    Animated.timing(stepFade, { toValue: 0, duration: 140, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setCurrentStep(next)
      Animated.timing(stepFade, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
        stepAnimatingRef.current = false
      })
    })
  }

  // Per-step "Next" gates. The full validation set still runs in handleSubmit
  // as a defensive final check.
  const stepCanAdvance =
    currentStep === 0
      ? Boolean(formData.serviceType.trim() || formData.selectedServices.length > 0)
      : currentStep === 1
      ? Boolean(formData.startDate && formData.endDate)
      : currentStep === 2
      ? formData.maxPrice.trim().length > 0
      : currentStep === 3
      ? uploadingCount === 0
      : true

  const handleNext = () => {
    if (currentStep === 3 && uploadingCount > 0) {
      showInfoToast("Attachment uploading", "Please wait for your photo/document to finish uploading before posting.")
      return
    }
    if (!stepCanAdvance || currentStep >= TOTAL_STEPS - 1) return
    goToStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) goToStep(currentStep - 1)
  }

  // ── Close / Submit ────────────────────────────────────────────────────────

  const handleClose = () => {
    onClose()
    setFormData(EMPTY_FORM)
    setSuccessInfo(null)
    setShowSaveTemplate(false)
    setTemplateName("")
    setActiveDateField(null)
    setCurrentStep(0)
    stepFade.setValue(1)
    stepAnimatingRef.current = false
  }

  const handlePostAnother = () => {
    setFormData(EMPTY_FORM)
    setSuccessInfo(null)
    setShowSaveTemplate(false)
    setTemplateName("")
    setActiveDateField(null)
    setCurrentStep(0)
    stepFade.setValue(1)
    stepAnimatingRef.current = false
  }

  useEffect(() => {
    if (!loading) {
      setShowSlowHint(false)
      return
    }
    const timer = setTimeout(() => setShowSlowHint(true), 4000)
    return () => clearTimeout(timer)
  }, [loading])

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current) return
    Keyboard.dismiss()
    const svcType = formData.serviceType.trim() || formData.selectedServices[0] || ""
    if (!isLoaded || !isSignedIn || !user) { showInfoToast("Sign in required", "Please sign in first."); return }
    if (!svcType || !formData.startDate || !formData.endDate || !formData.maxPrice) {
      showInfoToast("Missing fields", "Please fill in service type, dates, and budget."); return
    }
    const s = parseStoredDate(formData.startDate)
    const e = parseStoredDate(formData.endDate)
    const today = startOfDay(new Date())
    if (!s || !e) { showInfoToast("Invalid dates", "Please pick both dates from the calendar."); return }
    if (s < today) { showInfoToast("Past start date", "Choose today or a future start date."); return }
    if (e < s) { showInfoToast("Invalid end date", "End date must be on or after start date."); return }
    if (uploadingCount > 0) {
      showInfoToast("Attachment uploading", "Please wait for your photo/document to finish uploading before posting.")
      return
    }
    submittingRef.current = true
    try {
      setLoading(true)
      const token = await waitForClerkToken(getToken)
      if (!token) throw new Error("Token missing")
      const res = await fetchWithRetry(
        getApiUrl("/api/jobs"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            serviceType: svcType,
            selectedServices: formData.selectedServices.length > 0 ? formData.selectedServices : [svcType],
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
        },
        // No retries: this creates a job. If the response is just slow
        // (not actually failed) and we retried blindly, we'd risk posting
        // the same job twice with no idempotency key to de-dupe on the
        // backend. The backend's free-tier host can take 30-60s to wake
        // from a cold start though — 15s was cutting the single attempt
        // off before a cold start could ever finish, which looked
        // identical to the request just failing outright. A single patient
        // 45s attempt still avoids the double-post risk while actually
        // giving a cold start time to complete.
        { retries: 0, timeoutMs: 45000 }
      )
      if (res.status === 429 || res.status === 403) {
        const body = await res.json().catch(() => ({}))
        showErrorToast("Slow down", body?.message || "Too many requests. Please wait a moment before trying again.")
        setLoading(false)
        submittingRef.current = false
        return
      }
      const result = await res.json()
      if (res.status === 201 && result?.success) {
        const count = Number(result?.matchingSummary?.nearbyFreelancerCount) || 0
        setSuccessInfo({ serviceType: svcType, matchedCount: count })
      } else {
        showErrorToast("Error", result?.message || "Request failed.")
      }
    } catch (error) {
      console.error("Post task error:", error)
      const detail = error instanceof Error ? error.message : String(error)
      showErrorToast("Network error", detail || "Please try again.")
    } finally {
      setLoading(false)
      submittingRef.current = false
    }
  }, [formData, getToken, user, isLoaded, isSignedIn, taskLocation, uploadingCount])

  const locationDetected = !taskLocation.loading && !!taskLocation.label

  // ── Review summary rows ───────────────────────────────────────────────────

  const reviewSvcType = formData.serviceType.trim() || formData.selectedServices[0] || ""
  const reviewRows: Array<{ label: string; value: string; muted?: boolean }> = [
    { label: "Service", value: reviewSvcType || "Not set", muted: !reviewSvcType },
    {
      label: "Categories",
      value: formData.selectedServices.length > 0 ? formData.selectedServices.join(", ") : "None",
      muted: formData.selectedServices.length === 0,
    },
    {
      label: "Dates",
      value: formData.startDate && formData.endDate
        ? `${formatDateLabel(formData.startDate)} → ${formatDateLabel(formData.endDate)}`
        : "Not set",
      muted: !(formData.startDate && formData.endDate),
    },
    { label: "Max budget", value: formData.maxPrice ? `US$${formData.maxPrice}` : "Not set", muted: !formData.maxPrice },
    { label: "Specialist", value: formData.specialistChoice || "No preference", muted: !formData.specialistChoice },
    { label: "Notes", value: formData.additionalInfo.trim() || "None", muted: !formData.additionalInfo.trim() },
    {
      label: "Attachments",
      value: formData.documents.length === 1 ? "1 file" : `${formData.documents.length} files`,
      muted: formData.documents.length === 0,
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={st.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {successInfo ? (
          <SuccessScreen
            serviceType={successInfo.serviceType}
            matchedCount={successInfo.matchedCount}
            onPostAnother={handlePostAnother}
            onDone={handleClose}
          />
        ) : (
        <>
        {/* ── Header ── */}
        <View style={st.header}>
          <TouchableOpacity onPress={handleClose} style={st.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={17} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Post a Task</Text>
          <View style={st.closeBtn} />
        </View>

        {/* ── Progress indicator ── */}
        <View style={st.progressRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View key={i} style={[st.progressSegment, i <= currentStep && st.progressSegmentActive]} />
          ))}
        </View>

        {/* ── Scroll body ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={st.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
        >
          <Animated.View style={{ opacity: stepFade }}>

            {/* ── STEP 0 · WHAT ── */}
            {currentStep === 0 && (
              <>
                {/* Templates compact row */}
                {(templates.length > 0 || templatesLoading) && (
                  <View style={st.templatesBar}>
                    <Text style={st.templatesBarLabel}>Templates</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {templatesLoading ? (
                        <ActivityIndicator size="small" color={COLORS.textMuted} />
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
                              <Ionicons name="close" size={10} color={COLORS.textMuted} />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}

                <View style={st.section}>
                  <Text style={st.stepTitle}>What do you need?</Text>
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
              </>
            )}

            {/* ── STEP 1 · WHEN ── */}
            {currentStep === 1 && (
              <View style={st.section}>
                <Text style={st.stepTitle}>When?</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => openDatePicker("startDate")}
                    activeOpacity={0.8}
                    style={[st.dateBtn, { flex: 1 }]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={formData.startDate ? COLORS.primary : COLORS.textMuted}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={st.dateBtnLabel}>Start</Text>
                    <Text style={[st.dateBtnValue, !formData.startDate && st.dateBtnPlaceholder]}>
                      {formatDateLabel(formData.startDate)}
                    </Text>
                  </TouchableOpacity>

                  <View style={st.dateArrow}>
                    <Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} />
                  </View>

                  <TouchableOpacity
                    onPress={() => openDatePicker("endDate")}
                    activeOpacity={0.8}
                    style={[st.dateBtn, { flex: 1 }]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={formData.endDate ? COLORS.primary : COLORS.textMuted}
                      style={{ marginBottom: 6 }}
                    />
                    <Text style={st.dateBtnLabel}>End</Text>
                    <Text style={[st.dateBtnValue, !formData.endDate && st.dateBtnPlaceholder]}>
                      {formatDateLabel(formData.endDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 2 · BUDGET & SPECIALIST ── */}
            {currentStep === 2 && (
              <>
                <View style={st.section}>
                  <Text style={st.stepTitle}>Max budget</Text>
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

                <View style={st.section}>
                  <Text style={st.sectionLabel}>Specialist preference</Text>
                  <View style={{ gap: 10 }}>
                    {SPECIALIST_OPTIONS.map((opt, idx) => {
                      const active = formData.specialistChoice === opt.key
                      const accent = OPTION_ACCENTS[idx % OPTION_ACCENTS.length]
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          onPress={() => update({ specialistChoice: opt.key })}
                          activeOpacity={0.8}
                          style={[st.optionRow, active && st.optionRowActive]}
                        >
                          <View
                            style={[
                              st.optionIcon,
                              { backgroundColor: accent.soft },
                              active && st.optionIconActive,
                            ]}
                          >
                            <Ionicons name={opt.icon} size={18} color={active ? COLORS.surface : accent.strong} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[st.optionTitle, active && st.optionTitleActive]}>{opt.key}</Text>
                            <Text style={st.optionDesc}>{opt.desc}</Text>
                          </View>
                          {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                </View>
              </>
            )}

            {/* ── STEP 3 · DETAILS & ATTACHMENTS ── */}
            {currentStep === 3 && (
              <View style={st.section}>
                <Text style={st.stepTitle}>Additional details</Text>
                <View style={st.textarea}>
                  <TextInput
                    placeholder="Share any requirements, timing constraints, or access notes…"
                    placeholderTextColor={COLORS.textMuted}
                    value={formData.additionalInfo}
                    onChangeText={(t) => update({ additionalInfo: t })}
                    multiline
                    style={st.textareaInput}
                    textAlignVertical="top"
                  />
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <TouchableOpacity onPress={pickPhoto} style={st.attachButton} activeOpacity={0.75}>
                    <Ionicons name="image-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={st.attachButtonText}>Add photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={pickDocument} style={st.attachButton} activeOpacity={0.75}>
                    <Ionicons name="document-attach-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={st.attachButtonText}>Add document</Text>
                  </TouchableOpacity>
                  {uploadingCount > 0 ? <ActivityIndicator size="small" color={COLORS.primary} /> : null}
                </View>

                {formData.documents.length > 0 ? (
                  <View style={{ marginTop: 10, gap: 8 }}>
                    {formData.documents.map((url) => (
                      <View key={url} style={st.attachmentChip}>
                        <Ionicons name="document-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={st.attachmentChipText} numberOfLines={1}>
                          {attachmentNames[url] || url.split("/").pop()}
                        </Text>
                        <TouchableOpacity onPress={() => removeAttachment(url)}>
                          <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}

            {/* ── STEP 4 · REVIEW & POST ── */}
            {currentStep === 4 && (
              <>
                <View style={st.section}>
                  <Text style={st.stepTitle}>Review your task</Text>

                  <View style={st.reviewCard}>
                    {reviewRows.map((row, i) => (
                      <View key={row.label} style={[st.reviewRow, i === reviewRows.length - 1 && st.reviewRowLast]}>
                        <Text style={st.reviewLabel}>{row.label}</Text>
                        <Text
                          style={[st.reviewValue, row.muted && st.reviewValueMuted]}
                          numberOfLines={row.label === "Notes" ? 3 : 2}
                        >
                          {row.value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Location banner (informational, auto-detected) */}
                  <View
                    style={[
                      st.locationBanner,
                      st.locationBannerCard,
                      locationDetected && st.locationBannerDetected,
                      locationDetected && st.locationBannerCardDetected,
                    ]}
                  >
                    {taskLocation.loading ? (
                      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 9 }} />
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
                          ? <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                          : <Ionicons name="locate-outline" size={16} color={COLORS.textMuted} />}
                      </TouchableOpacity>
                    )}
                  </View>
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
                            ? <ActivityIndicator size="small" color={COLORS.surface} />
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
                      <Ionicons name="bookmark-outline" size={13} color={COLORS.textMuted} />
                      <Text style={st.saveTemplateToggleText}>Save current form as template</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

          </Animated.View>

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* ── Footer (wizard navigation) ── */}
        {loading && showSlowHint && (
          <Text style={st.slowHintText}>
            Waking up the server — this can take up to a minute on the first request.
          </Text>
        )}
        <View style={st.footer}>
          {currentStep > 0 ? (
            <TouchableOpacity onPress={handleBack} disabled={loading} activeOpacity={0.8} style={st.backBtn}>
              <Ionicons name="arrow-back" size={15} color={COLORS.textSecondary} />
              <Text style={st.backBtnText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {currentStep < TOTAL_STEPS - 1 ? (
            <TouchableOpacity
              onPress={handleNext}
              disabled={currentStep === 3 ? false : !stepCanAdvance}
              activeOpacity={0.85}
              style={[st.submitBtn, !stepCanAdvance && st.submitBtnDisabled]}
            >
              <Text style={st.submitBtnText}>Next</Text>
              <View style={st.submitArrow}>
                <Ionicons name="arrow-forward" size={15} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={loading || uploadingCount > 0}
              activeOpacity={0.85}
              style={st.submitBtn}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.surface} />
              ) : (
                <>
                  <Text style={st.submitBtnText}>Post Task</Text>
                  <View style={st.submitArrow}>
                    <Ionicons name="arrow-forward" size={15} color={COLORS.primary} />
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}
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
                  <Ionicons name="close" size={16} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={st.calNav}>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  style={st.calNavBtn}
                >
                  <Ionicons name="chevron-back" size={14} color={COLORS.textSecondary} />
                  <Text style={st.calNavBtnText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  style={[st.calNavBtn, st.calNavBtnNext]}
                >
                  <Text style={[st.calNavBtnText, st.calNavBtnTextNext]}>Next</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.surface} />
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
        </>
        )}

      </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  attachButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.borderDashed,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: SPACING.sm + 2,
  },
  attachButtonText: { fontSize: 13, fontFamily: "PlusJakartaSans_600SemiBold", color: COLORS.textSecondary },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...SHADOW.card,
  },
  attachmentChipText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  // Progress indicator
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.border,
  },
  progressSegmentActive: {
    backgroundColor: COLORS.primary,
  },

  // Location banner
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: COLORS.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
    gap: 9,
  },
  locationBannerDetected: {
    backgroundColor: COLORS.primarySoft,
    borderBottomColor: "#D1FAE5",
  },
  // Card variant used on the Review step
  locationBannerCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.card,
  },
  locationBannerCardDetected: {
    borderColor: "#D1FAE5",
    borderBottomColor: "#D1FAE5",
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  locationDotOn: { backgroundColor: COLORS.primary },
  locationDotOff: { backgroundColor: COLORS.textMuted },
  locationText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textMuted,
    flex: 1,
  },
  locationTextDetected: { color: COLORS.primary },

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
    borderBottomColor: COLORS.borderSoft,
    gap: 10,
  },
  templatesBarLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.pill,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 7,
    gap: 6,
    maxWidth: 140,
    ...SHADOW.card,
  },
  templateChipText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textPrimary,
  },
  templateChipX: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceMuted,
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
  // Primary "step question" heading — one per step, larger/bolder than
  // secondary in-step field labels (see sectionLabel below).
  stepTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderSoft,
    marginHorizontal: 20,
  },

  // Input
  input: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    ...SHADOW.card,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  inputPrefix: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textPrimary,
    marginRight: 4,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "PlusJakartaSans_400Regular",
    color: COLORS.textPrimary,
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
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.surface,
  },

  // Date
  dateBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    ...SHADOW.card,
  },
  dateBtnLabel: {
    fontSize: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  dateBtnValue: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textPrimary,
  },
  dateBtnPlaceholder: {
    color: COLORS.textMuted,
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
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  optionRowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconActive: {
    backgroundColor: COLORS.primary,
  },
  optionTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textPrimary,
    marginBottom: 1,
  },
  optionTitleActive: {
    color: COLORS.primaryDark,
  },
  optionDesc: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: COLORS.textMuted,
  },

  // Textarea
  textarea: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
    padding: 14,
    minHeight: 96,
    ...SHADOW.card,
  },
  textareaInput: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: COLORS.textPrimary,
    minHeight: 72,
    padding: 0,
    lineHeight: 21,
  },

  // Review summary
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.xl,
    paddingHorizontal: 18,
    paddingVertical: 2,
    ...SHADOW.card,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSoft,
  },
  reviewRowLast: {
    borderBottomWidth: 0,
  },
  reviewLabel: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textMuted,
    flexShrink: 0,
    paddingTop: 1,
  },
  reviewValue: {
    flex: 1,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textPrimary,
    textAlign: "right",
  },
  reviewValueMuted: {
    fontFamily: "PlusJakartaSans_400Regular",
    color: COLORS.textMuted,
  },

  // Save template
  saveTemplateToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveTemplateToggleText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textMuted,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.textPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.surface,
  },

  // Footer
  slowHintText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: COLORS.surface,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSoft,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textSecondary,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.xl,
    paddingRight: 16,
    minWidth: 152,
    ...SHADOW.raised,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.surface,
    letterSpacing: 0.2,
    flex: 1,
    textAlign: "center",
  },
  submitArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
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
    backgroundColor: "rgba(28, 27, 24, 0.45)",
  },
  calSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    paddingTop: 14,
    ...SHADOW.raised,
  },
  calSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
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
    color: COLORS.primary,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  calMonthTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans_700Bold",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  calCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceMuted,
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
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calNavBtnNext: {
    backgroundColor: COLORS.textPrimary,
    borderColor: COLORS.textPrimary,
  },
  calNavBtnText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: COLORS.textSecondary,
  },
  calNavBtnTextNext: {
    color: COLORS.surface,
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
    color: COLORS.textMuted,
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
    borderRadius: RADIUS.lg,
    marginBottom: 4,
  },
  calCellSelected: {
    backgroundColor: COLORS.textPrimary,
  },
  calCellDisabled: {
    opacity: 0.28,
  },
  calCellText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_500Medium",
    color: COLORS.textPrimary,
  },
  calCellTextSelected: {
    color: COLORS.surface,
    fontFamily: "PlusJakartaSans_700Bold",
  },
})
