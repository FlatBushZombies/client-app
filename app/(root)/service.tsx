"use client"

import { useState, useCallback, useEffect } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useUser, useAuth } from "@clerk/clerk-expo"
import { getApiUrl } from "@/lib/fetch"
import * as Location from "expo-location"

interface FormData {
  serviceType: string
  selectedServices: string[]
  startDate: string
  endDate: string
  maxPrice: string
  specialistChoice: string
  additionalInfo: string
  documents: string
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

function startOfDay(date: Date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  return nextDate
}

function formatDateForApi(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseStoredDate(value: string) {
  if (!value) return null
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }
  return startOfDay(parsedDate)
}

function formatDateLabel(value: string) {
  const parsedDate = parseStoredDate(value)
  if (!parsedDate) return "Select date"
  return parsedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function buildCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const leadingDays = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const cells: Array<{ key: string; date: Date | null }> = []

  for (let index = 0; index < leadingDays; index += 1) {
    cells.push({ key: `leading-${index}`, date: null })
  }

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({
      key: `${month.getFullYear()}-${month.getMonth()}-${day}`,
      date: new Date(month.getFullYear(), month.getMonth(), day),
    })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `trailing-${cells.length}`, date: null })
  }

  return cells
}

function DateField({
  label,
  value,
  onPress,
}: {
  label: string
  value: string
  onPress: () => void
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold text-green-700 tracking-[0.6px] uppercase font-jakarta-bold">
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.82}
        className="flex-row items-center rounded-xl border-[1.5px] border-green-200 bg-[#F0F7F4] px-3.5"
        style={{ paddingVertical: Platform.OS === "ios" ? 13 : 11 }}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color="#1A7F5A"
          style={{ marginRight: 8 }}
        />
        <Text className={`flex-1 text-sm font-jakarta ${value ? "text-green-950" : "text-[#93C9AE]"}`}>
          {formatDateLabel(value)}
        </Text>
        <Ionicons name="chevron-down" size={15} color="#3D7A5E" />
      </TouchableOpacity>
    </View>
  )
}

// ─── Reusable labelled input ───────────────────────────────────────
function Field({
  label,
  icon,
  ...props
}: {
  label: string
  icon?: string
  [k: string]: any
}) {
  const [focused, setFocused] = useState(false)
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-bold text-green-700 tracking-[0.6px] uppercase font-jakarta-bold">
        {label}
      </Text>
      <View
        className={`flex-row items-center rounded-xl px-3.5 border-[1.5px] ${
          focused ? "border-green-700 bg-[#F5FBF8]" : "border-green-200 bg-[#F0F7F4]"
        }`}
        style={{ paddingVertical: Platform.OS === "ios" ? 13 : 10 }}
      >
        {icon && (
          <Ionicons
            name={icon as any}
            size={16}
            color={focused ? "#1A7F5A" : "#93C9AE"}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          className="flex-1 text-sm text-green-950 p-0 font-jakarta"
          placeholderTextColor="#93C9AE"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
    </View>
  )
}

// ─── Section card ─────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      className="bg-white rounded-[18px] p-5 border border-green-200 gap-3"
      style={{ shadowColor: "#1A7F5A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="flex-row items-center gap-2.5">
        <View className="w-[3px] h-[18px] rounded-sm bg-green-700" />
        <Text className="text-[15px] font-bold text-green-950 tracking-[-0.2px] font-jakarta-bold">
          {title}
        </Text>
      </View>
      {children}
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────
export default function ServiceRequestScreen() {
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templates, setTemplates] = useState<JobTemplate[]>([])
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null)
  const [calendarMonth, setCalendarMonth] = useState(startOfDay(new Date()))
  const { user, isLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const [taskLocation, setTaskLocation] = useState<TaskLocationState>({
    loading: false,
    label: null,
    city: null,
    latitude: null,
    longitude: null,
  })

  const [formData, setFormData] = useState<FormData>({
    serviceType: "",
    selectedServices: [],
    startDate: "",
    endDate: "",
    maxPrice: "",
    specialistChoice: "",
    additionalInfo: "",
    documents: "",
  })

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const openDatePicker = (field: DateFieldKey) => {
    const existingDate = parseStoredDate(formData[field])
    const comparisonDate =
      existingDate ||
      (field === "endDate" ? parseStoredDate(formData.startDate) : null) ||
      startOfDay(new Date())
    setCalendarMonth(
      new Date(comparisonDate.getFullYear(), comparisonDate.getMonth(), 1)
    )
    setActiveDateField(field)
  }

  const handleDateSelection = (date: Date) => {
    const normalizedDate = startOfDay(date)
    const today = startOfDay(new Date())

    if (normalizedDate < today) {
      Alert.alert("Pick a future date", "Please choose today or a future day for this job.")
      return
    }

    if (activeDateField === "startDate") {
      const nextStartDate = formatDateForApi(normalizedDate)
      const currentEndDate = parseStoredDate(formData.endDate)

      updateFormData({
        startDate: nextStartDate,
        endDate:
          currentEndDate && currentEndDate >= normalizedDate
            ? formData.endDate
            : nextStartDate,
      })
    }

    if (activeDateField === "endDate") {
      const currentStartDate = parseStoredDate(formData.startDate)
      if (currentStartDate && normalizedDate < currentStartDate) {
        Alert.alert("End date is too early", "Choose an end date on or after the start date.")
        return
      }

      updateFormData({
        endDate: formatDateForApi(normalizedDate),
      })
    }

    setActiveDateField(null)
  }

  const applyTemplate = (template: JobTemplate) => {
    setFormData({
      serviceType: template.serviceType,
      selectedServices: template.selectedServices,
      startDate: template.startDate,
      endDate: template.endDate,
      maxPrice: String(template.maxPrice || ""),
      specialistChoice: template.specialistChoice,
      additionalInfo: template.additionalInfo,
      documents: (template.documents || []).join(", "),
    })
  }

  const handleServiceToggle = (service: string) => {
    const updated = formData.selectedServices.includes(service)
      ? formData.selectedServices.filter((s) => s !== service)
      : [...formData.selectedServices, service]
    updateFormData({ selectedServices: updated })
  }

  const syncUserLocation = useCallback(
    async (location: Omit<TaskLocationState, "loading">) => {
      try {
        const token = await getToken()
        if (!token || !user?.id) {
          return
        }

        await fetch(getApiUrl("/api/user/location"), {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            clerkId: user.id,
            label: location.label,
            city: location.city,
            latitude: location.latitude,
            longitude: location.longitude,
          }),
        })
      } catch (error) {
        console.warn("[Location] Failed to sync client location", error)
      }
    },
    [getToken, user?.id]
  )

  const loadTaskLocation = useCallback(async () => {
    try {
      setTaskLocation((current) => ({ ...current, loading: true }))
      const { status } = await Location.requestForegroundPermissionsAsync()

      if (status !== "granted") {
        setTaskLocation({
          loading: false,
          label: null,
          city: null,
          latitude: null,
          longitude: null,
        })
        return
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const [result] = await Location.reverseGeocodeAsync({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      })

      const nextLocation = {
        label:
          result?.city ||
          result?.district ||
          result?.subregion ||
          result?.region ||
          "Your current area",
        city: result?.city || result?.district || result?.subregion || null,
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      }

      setTaskLocation({
        loading: false,
        ...nextLocation,
      })
      await syncUserLocation(nextLocation)
    } catch (error) {
      console.warn("[Location] Failed to capture task location", error)
      setTaskLocation({
        loading: false,
        label: null,
        city: null,
        latitude: null,
        longitude: null,
      })
    }
  }, [syncUserLocation])

  useEffect(() => {
    if (modalVisible) {
      void loadTaskLocation()
    }
  }, [loadTaskLocation, modalVisible])

  const fetchTemplates = useCallback(async () => {
    if (!user?.id) return

    try {
      setTemplatesLoading(true)
      const token = await getToken()
      const response = await fetch(getApiUrl("/api/user/me/templates"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to fetch templates")
      setTemplates(Array.isArray(data.templates) ? data.templates : [])
    } catch (error) {
      console.warn("[Templates] Failed to fetch templates", error)
      setTemplates([])
    } finally {
      setTemplatesLoading(false)
    }
  }, [getToken, user?.id])

  useEffect(() => {
    if (modalVisible) {
      void fetchTemplates()
    }
  }, [fetchTemplates, modalVisible])

  const saveCurrentTemplate = useCallback(async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in before saving templates.")
      return
    }

    if (!formData.serviceType.trim()) {
      Alert.alert("Missing service", "Add at least a service type before saving a template.")
      return
    }

    try {
      setSavingTemplate(true)
      const token = await getToken()
      const response = await fetch(getApiUrl("/api/user/me/templates"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: templateName.trim() || formData.serviceType,
          serviceType: formData.serviceType,
          selectedServices: formData.selectedServices,
          startDate: formData.startDate,
          endDate: formData.endDate,
          maxPrice: Number(formData.maxPrice) || 0,
          specialistChoice: formData.specialistChoice,
          additionalInfo: formData.additionalInfo,
          documents: formData.documents
            ? formData.documents.split(",").map((entry) => entry.trim()).filter(Boolean)
            : [],
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to save template")
      setTemplateName("")
      await fetchTemplates()
      Alert.alert("Template saved", "You can reuse this job setup any time.")
    } catch (error) {
      Alert.alert("Template error", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setSavingTemplate(false)
    }
  }, [fetchTemplates, formData, getToken, templateName, user?.id])

  const deleteTemplate = useCallback(async (templateId: string) => {
    try {
      const token = await getToken()
      const response = await fetch(getApiUrl(`/api/user/me/templates/${templateId}`), {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || "Failed to delete template")
      await fetchTemplates()
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Please try again.")
    }
  }, [fetchTemplates, getToken])

  const handleSubmit = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) {
      Alert.alert("Authentication Required", "Please sign in first.")
      return
    }
    if (!formData.serviceType || !formData.startDate || !formData.endDate || !formData.maxPrice) {
      Alert.alert("Missing Fields", "Please complete all required fields.")
      return
    }

    const parsedStartDate = parseStoredDate(formData.startDate)
    const parsedEndDate = parseStoredDate(formData.endDate)
    const today = startOfDay(new Date())

    if (!parsedStartDate || !parsedEndDate) {
      Alert.alert("Invalid dates", "Please choose both dates from the date picker.")
      return
    }

    if (parsedStartDate < today) {
      Alert.alert("Start date is in the past", "Please choose today or a future start date.")
      return
    }

    if (parsedEndDate < parsedStartDate) {
      Alert.alert("End date is too early", "The end date must be the same as or after the start date.")
      return
    }

    try {
      setLoading(true)
      const token = await getToken()
      if (!token) throw new Error("Token missing")
      const payload = {
        serviceType: formData.serviceType,
        selectedServices: formData.selectedServices,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxPrice: Number(formData.maxPrice),
        specialistChoice: formData.specialistChoice,
        additionalInfo: formData.additionalInfo,
        documents: formData.documents
          ? formData.documents.split(",").map((d) => d.trim())
          : [],
        clerkId: user.id,
        userName: user.fullName || "Anonymous",
        userAvatar: user.imageUrl || null,
        location: {
          label: taskLocation.label,
          city: taskLocation.city,
          latitude: taskLocation.latitude,
          longitude: taskLocation.longitude,
        },
      }
      const response = await fetch(getApiUrl("/api/jobs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (response.status === 201 && result?.success) {
        const nearbyFreelancerCount = Number(result?.matchingSummary?.nearbyFreelancerCount) || 0
        Alert.alert(
          "Success",
          nearbyFreelancerCount > 0
            ? `Service request created successfully. ${nearbyFreelancerCount} nearby freelancer${nearbyFreelancerCount === 1 ? "" : "s"} were prioritised for notifications in your area.`
            : "Service request created successfully. Matching nearby freelancers will be notified as they become available."
        )
        setFormData({
          serviceType: "",
          selectedServices: [],
          startDate: "",
          endDate: "",
          maxPrice: "",
          specialistChoice: "",
          additionalInfo: "",
          documents: "",
        })
        setModalVisible(false)
      } else {
        Alert.alert("Error", result?.message || "Request failed.")
      }
    } catch {
      Alert.alert("Network Error", "Please try again.")
    } finally {
      setLoading(false)
    }
  }, [formData, getToken, user, isLoaded, isSignedIn, taskLocation])

  return (
    <SafeAreaView className="flex-1 bg-[#0A1F16]">

      {/* ── ENTRY SCREEN (dark green) ── */}
      <View className="flex-1 justify-center px-7 overflow-hidden">

        {/* decorative ring accents */}
        <View
          className="absolute w-[360px] h-[360px] rounded-full border border-[#2AAD7E] opacity-45"
          style={{ top: -110, right: -130 }}
        />
        <View
          className="absolute w-[220px] h-[220px] rounded-full border border-[#2AAD7E] opacity-35"
          style={{ bottom: 50, left: -80 }}
        />

        {/* Q logo mark */}
        <View
          className="w-[52px] h-[52px] rounded-[14px] bg-green-700 items-center justify-center mb-7"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 }}
        >
          <Text className="text-[30px] font-black text-green-900 tracking-[-1px] leading-9 font-jakarta-bold">Q</Text>
        </View>

        {/* Badge */}
        <View className="flex-row items-center self-start bg-[#1E8F65] px-3 py-1.5 rounded-full mb-5 gap-[7px] border border-[#239970]">
          <View className="w-[7px] h-[7px] rounded-full bg-green-400" />
          <Text className="text-xs font-semibold text-green-400 tracking-[0.4px] font-jakarta-semibold">
            Trusted Professionals
          </Text>
        </View>

        <Text className="text-[42px] font-extrabold text-white leading-[50px] tracking-[-1.2px] mb-3.5 font-jakarta-bold">
          Post a task{"\n"}in minutes
        </Text>
        <Text className="text-[15px] text-green-400 leading-[23px] mb-9 max-w-[310px] font-jakarta">
          Tell us what you need and get matched with trusted professionals instantly.
        </Text>

        <TouchableOpacity
          className="flex-row items-center self-start bg-white py-3.5 pl-[22px] pr-3.5 rounded-full gap-2.5 mb-9"
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 }}
        >
          <Text className="text-green-700 text-[15px] font-bold tracking-wide font-jakarta-bold">
            Create a Job
          </Text>
          <View className="w-[30px] h-[30px] rounded-full bg-green-50 items-center justify-center">
            <Ionicons name="arrow-forward" size={15} color="#1A7F5A" />
          </View>
        </TouchableOpacity>

        {/* stat pills */}
        <View className="flex-row gap-2">
          {[
            { icon: "star",             label: "4.9 Rating" },
            { icon: "people",           label: "12k+ Pros"  },
            { icon: "shield-checkmark", label: "Verified"   },
          ].map((s) => (
            <View
              key={s.label}
              className="flex-row items-center bg-[#1E8F65] px-[11px] py-[7px] rounded-full gap-[5px] border border-[#239970]"
            >
              <Ionicons name={s.icon as any} size={12} color="#6DAF92" />
              <Text className="text-xs text-green-400 font-semibold font-jakarta-semibold">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-[#F0F7F4]">

          {/* header */}
          <View className="flex-row items-center justify-between px-5 py-4 bg-white border-b border-green-200">
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="w-9 h-9 rounded-full bg-[#F0F7F4] items-center justify-center"
            >
              <Ionicons name="close" size={18} color="#0D3D27" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-green-950 tracking-[-0.3px] font-jakarta-bold">
              Post Job Request
            </Text>
            <View className="w-9" />
          </View>

          {/* progress bar */}
          <View className="flex-row gap-[5px] px-5 py-3 bg-white">
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className={`h-[3px] flex-1 rounded-sm ${i === 0 ? "bg-green-700" : "bg-green-200"}`}
              />
            ))}
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 120, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <Card title="Saved Templates">
              <Field
                label="Template name"
                icon="bookmark-outline"
                placeholder="e.g. Standard plumber visit"
                value={templateName}
                onChangeText={setTemplateName}
              />
              <TouchableOpacity
                onPress={() => void saveCurrentTemplate()}
                disabled={savingTemplate}
                className="rounded-xl bg-green-700 px-4 py-3 items-center"
                activeOpacity={0.85}
              >
                {savingTemplate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-sm font-bold font-jakarta-bold">
                    Save current form as template
                  </Text>
                )}
              </TouchableOpacity>

              {templatesLoading ? (
                <View className="py-3 items-center">
                  <ActivityIndicator size="small" color="#1A7F5A" />
                </View>
              ) : templates.length === 0 ? (
                <Text className="text-sm text-green-700 font-jakarta">
                  No saved templates yet. Save one once and reuse it for future jobs.
                </Text>
              ) : (
                <View className="gap-2">
                  {templates.map((template) => (
                    <View
                      key={template.id}
                      className="rounded-[14px] border-[1.5px] border-green-200 bg-[#F0F7F4] p-3.5"
                    >
                      <View className="flex-row items-center justify-between mb-1.5">
                        <Text className="text-sm font-bold text-green-950 font-jakarta-bold flex-1 mr-3">
                          {template.name}
                        </Text>
                        <TouchableOpacity onPress={() => void deleteTemplate(template.id)}>
                          <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                        </TouchableOpacity>
                      </View>
                      <Text className="text-xs text-green-700 font-jakarta mb-3">
                        {template.serviceType} · {template.selectedServices.join(", ") || "General"} · R{template.maxPrice || 0}
                      </Text>
                      <TouchableOpacity
                        onPress={() => applyTemplate(template)}
                        className="self-start rounded-full bg-white border border-green-200 px-3.5 py-2"
                      >
                        <Text className="text-xs font-semibold text-green-700 font-jakarta-semibold">
                          Use template
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* SERVICE TYPE */}
            <Card title="Service Type">
              <Field
                label="What do you need?"
                icon="construct-outline"
                placeholder="e.g. Plumbing, Cleaning"
                value={formData.serviceType}
                onChangeText={(t: string) => updateFormData({ serviceType: t })}
              />
              <Text className="text-[11px] font-bold text-green-700 tracking-[0.6px] uppercase font-jakarta-bold">
                Quick select
              </Text>
              <View className="flex-row gap-2 flex-wrap">
                {["Plumbing", "Electrical", "Cleaning"].map((service) => {
                  const active = formData.selectedServices.includes(service)
                  return (
                    <TouchableOpacity
                      key={service}
                      onPress={() => handleServiceToggle(service)}
                      className={`px-3.5 py-2 rounded-full border-[1.5px] ${
                        active ? "bg-green-700 border-green-700" : "bg-[#F0F7F4] border-green-200"
                      }`}
                      activeOpacity={0.75}
                    >
                      <Text className={`text-[13px] font-semibold font-jakarta-semibold ${active ? "text-white" : "text-green-700"}`}>
                        {service}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </Card>

            {/* TIMELINE */}
            <Card title="Timeline">
              <View className="rounded-[14px] border-[1.5px] border-green-200 bg-[#F0F7F4] px-4 py-3">
                <Text className="text-sm font-jakarta-semibold text-green-950">
                  Choose the dates from the calendar
                </Text>
                <Text className="mt-1 text-xs leading-5 text-green-700 font-jakarta">
                  We automatically keep the end date aligned with the start date so your request timeline stays valid.
                </Text>
              </View>
              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <DateField
                    label="Start date"
                    value={formData.startDate}
                    onPress={() => openDatePicker("startDate")}
                  />
                </View>
                <View className="flex-1 ml-2">
                  <DateField
                    label="End date"
                    value={formData.endDate}
                    onPress={() => openDatePicker("endDate")}
                  />
                </View>
              </View>
            </Card>

            {/* BUDGET */}
            <Card title="Budget">
              <Field
                label="Maximum price"
                icon="cash-outline"
                placeholder="0.00"
                value={formData.maxPrice}
                onChangeText={(t: string) => updateFormData({ maxPrice: t })}
                keyboardType="numeric"
              />
            </Card>

            <Card title="Task Area">
              <View className="rounded-[14px] border-[1.5px] border-green-200 bg-[#F0F7F4] px-4 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-[11px] font-bold text-green-700 tracking-[0.6px] uppercase font-jakarta-bold">
                      Nearby matching
                    </Text>
                    <Text className="mt-1 text-sm text-green-950 font-jakarta-semibold">
                      {taskLocation.loading
                        ? "Detecting your current area..."
                        : taskLocation.label || "Allow location to match nearby freelancers"}
                    </Text>
                    <Text className="mt-1 text-xs text-green-700 font-jakarta leading-5">
                      Jobs posted with location reach freelancers closest to you first and appear as In your Area on their side.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => void loadTaskLocation()}
                    className="w-11 h-11 rounded-full bg-white items-center justify-center border border-green-200"
                    activeOpacity={0.8}
                  >
                    {taskLocation.loading ? (
                      <ActivityIndicator size="small" color="#1A7F5A" />
                    ) : (
                      <Ionicons name="locate-outline" size={19} color="#1A7F5A" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

            {/* SPECIALIST */}
            <Card title="Specialist Preference">
              {[
                { key: "Any Specialist",  desc: "We'll match you automatically", icon: "people-outline"   },
                { key: "Top Rated",       desc: "Highest reviewed professionals", icon: "star-outline"     },
                { key: "Most Affordable", desc: "Lowest cost options",            icon: "pricetag-outline" },
              ].map((choice) => {
                const active = formData.specialistChoice === choice.key
                return (
                  <TouchableOpacity
                    key={choice.key}
                    onPress={() => updateFormData({ specialistChoice: choice.key })}
                    className={`flex-row items-center gap-3.5 p-3.5 rounded-[14px] border-[1.5px] ${
                      active ? "border-green-700 bg-green-50" : "border-green-200 bg-[#F0F7F4]"
                    }`}
                    activeOpacity={0.8}
                  >
                    <View className={`w-[38px] h-[38px] rounded-full items-center justify-center border ${
                      active ? "bg-green-700 border-green-700" : "bg-white border-green-200"
                    }`}>
                      <Ionicons
                        name={choice.icon as any}
                        size={17}
                        color={active ? "#FFFFFF" : "#3D7A5E"}
                      />
                    </View>
                    <View className="flex-1">
                      <Text className={`text-sm font-bold mb-0.5 font-jakarta-bold ${active ? "text-green-700" : "text-green-950"}`}>
                        {choice.key}
                      </Text>
                      <Text className="text-xs text-green-700 font-jakarta">{choice.desc}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color="#1A7F5A" />}
                  </TouchableOpacity>
                )
              })}
            </Card>

            {/* ADDITIONAL INFO */}
            <Card title="Additional Details">
              <Text className="text-[11px] font-bold text-green-700 tracking-[0.6px] uppercase font-jakarta-bold">
                Describe your task
              </Text>
              <View className="bg-[#F0F7F4] rounded-xl border-[1.5px] border-green-200 px-3.5 py-3">
                <TextInput
                  placeholder="Include relevant details about location, timing, or special requirements..."
                  placeholderTextColor="#93C9AE"
                  value={formData.additionalInfo}
                  onChangeText={(t) => updateFormData({ additionalInfo: t })}
                  multiline
                  numberOfLines={4}
                  className="text-sm text-green-950 min-h-[96px] font-jakarta"
                  textAlignVertical="top"
                />
              </View>
              <Field
                label="Document URLs"
                icon="link-outline"
                placeholder="https:// (optional, comma-separated)"
                value={formData.documents}
                onChangeText={(t: string) => updateFormData({ documents: t })}
              />
            </Card>
          </ScrollView>

          {/* FOOTER */}
          <View
            className="absolute bottom-0 left-0 right-0 px-5 pt-3.5 bg-white border-t border-green-200"
            style={{ paddingBottom: Platform.OS === "ios" ? 34 : 20 }}
          >
            <TouchableOpacity
              className="bg-green-700 rounded-full py-[15px] flex-row items-center justify-center"
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
              style={{ shadowColor: "#0F5C3F", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6 }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-white text-base font-bold tracking-wide font-jakarta-bold">
                    Post Job Request
                  </Text>
                  <Ionicons name="send" size={15} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </Modal>

      <Modal
        visible={activeDateField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDateField(null)}
      >
        <View className="flex-1 justify-end bg-black/35 px-4 pb-8">
          <View className="rounded-[28px] border border-green-200 bg-white p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-[11px] font-bold uppercase tracking-[0.6px] text-green-700 font-jakarta-bold">
                  {activeDateField === "startDate" ? "Start date" : "End date"}
                </Text>
                <Text className="mt-1 text-lg font-bold text-green-950 font-jakarta-bold">
                  {monthLabel(calendarMonth)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setActiveDateField(null)}
                className="w-10 h-10 rounded-full bg-[#F0F7F4] items-center justify-center"
              >
                <Ionicons name="close" size={18} color="#0D3D27" />
              </TouchableOpacity>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1)
                  )
                }
                className="rounded-full bg-[#F0F7F4] px-4 py-2.5"
              >
                <Text className="text-xs font-bold text-green-700 font-jakarta-bold">Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1)
                  )
                }
                className="rounded-full bg-green-700 px-4 py-2.5"
              >
                <Text className="text-xs font-bold text-white font-jakarta-bold">Next</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-5 flex-row justify-between">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text
                  key={day}
                  className="w-[13%] text-center text-[11px] font-bold uppercase tracking-[0.6px] text-green-700 font-jakarta-bold"
                >
                  {day}
                </Text>
              ))}
            </View>

            <View className="mt-3 flex-row flex-wrap justify-between">
              {buildCalendarDays(calendarMonth).map((cell) => {
                if (!cell.date) {
                  return <View key={cell.key} style={{ width: "13%", height: 46, marginBottom: 8 }} />
                }

                const normalizedDate = startOfDay(cell.date)
                const today = startOfDay(new Date())
                const selectedStartDate = parseStoredDate(formData.startDate)
                const selectedEndDate = parseStoredDate(formData.endDate)
                const isDisabled =
                  normalizedDate < today ||
                  (activeDateField === "endDate" &&
                    selectedStartDate !== null &&
                    normalizedDate < selectedStartDate)
                const isSelected =
                  (activeDateField === "startDate" &&
                    selectedStartDate?.getTime() === normalizedDate.getTime()) ||
                  (activeDateField === "endDate" &&
                    selectedEndDate?.getTime() === normalizedDate.getTime())

                return (
                  <TouchableOpacity
                    key={cell.key}
                    onPress={() => handleDateSelection(normalizedDate)}
                    disabled={isDisabled}
                    activeOpacity={0.82}
                    className={`items-center justify-center rounded-2xl mb-2 ${
                      isSelected ? "bg-green-700" : "bg-[#F0F7F4]"
                    }`}
                    style={{ width: "13%", height: 46, opacity: isDisabled ? 0.35 : 1 }}
                  >
                    <Text
                      className={`text-sm font-semibold font-jakarta-semibold ${
                        isSelected ? "text-white" : "text-green-950"
                      }`}
                    >
                      {normalizedDate.getDate()}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View className="mt-3 rounded-[16px] bg-[#F0F7F4] px-4 py-3">
              <Text className="text-xs leading-5 text-green-700 font-jakarta">
                Start dates can be today or later. End dates must be the same as or after the selected start date.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}
