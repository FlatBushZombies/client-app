"use client"

import { useState, useCallback } from "react"
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
  const { user, isLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()

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

  const API_BASE = "https://quickhands-api.vercel.app"

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleServiceToggle = (service: string) => {
    const updated = formData.selectedServices.includes(service)
      ? formData.selectedServices.filter((s) => s !== service)
      : [...formData.selectedServices, service]
    updateFormData({ selectedServices: updated })
  }

  const handleSubmit = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) {
      Alert.alert("Authentication Required", "Please sign in first.")
      return
    }
    if (!formData.serviceType || !formData.startDate || !formData.endDate || !formData.maxPrice) {
      Alert.alert("Missing Fields", "Please complete all required fields.")
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
      }
      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (response.status === 201 && result?.success) {
        Alert.alert("Success", "Service request created successfully.")
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
  }, [formData, user, isLoaded, isSignedIn])

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
              <View className="flex-row">
                <View className="flex-1 mr-2">
                  <Field
                    label="Start date"
                    icon="calendar-outline"
                    placeholder="mm/dd/yyyy"
                    value={formData.startDate}
                    onChangeText={(t: string) => updateFormData({ startDate: t })}
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Field
                    label="End date"
                    icon="calendar-outline"
                    placeholder="mm/dd/yyyy"
                    value={formData.endDate}
                    onChangeText={(t: string) => updateFormData({ endDate: t })}
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
    </SafeAreaView>
  )
}