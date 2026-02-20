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
  StyleSheet,
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

// ─── Design tokens — QuickHands green palette ─────────────────────
const C = {
  // Core brand — rich sage / emerald greens
  navy:        "#1A7F5A",   // primary — logo bg (deep emerald)
  navyDark:    "#0F5C3F",   // deepest green — logo Q mark
  navyMid:     "#1E8F65",   // cards on dark bg
  navyLight:   "#239970",   // elevated surfaces
  navyGhost:   "#2AAD7E",   // borders / dividers on dark

  // Entry screen (dark)
  entryBg:     "#0A1F16",   // deepest background
  entryCard:   "#0F2D1F",

  // Modal (light)
  modalBg:     "#F0F7F4",
  surface:     "#FFFFFF",
  border:      "#CEEADE",
  borderFocus: "#1A7F5A",

  // Text
  textLight:   "#FFFFFF",
  textNavy:    "#0D3D27",
  textSub:     "#3D7A5E",
  textMuted:   "#6DAF92",
  placeholder: "#93C9AE",

  // Tint
  accentSoft:  "#E6F5EE",

  white:       "#FFFFFF",
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
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, focused && styles.inputRowFocused]}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={16}
            color={focused ? C.navy : C.placeholder}
            style={{ marginRight: 8 }}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={C.placeholder}
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
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardAccentBar} />
        <Text style={styles.cardTitle}>{title}</Text>
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
    <SafeAreaView style={styles.root}>

      {/* ── ENTRY SCREEN (dark green) ── */}
      <View style={styles.entryWrap}>

        {/* decorative ring accents */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Q logo mark */}
        <View style={styles.logoMark}>
          <Text style={styles.logoQ}>Q</Text>
        </View>

        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Trusted Professionals</Text>
        </View>

        <Text style={styles.heroTitle}>Post a task{"\n"}in minutes</Text>
        <Text style={styles.heroSub}>
          Tell us what you need and get matched with trusted professionals instantly.
        </Text>

        <TouchableOpacity
          style={styles.heroCta}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.heroCtaText}>Create a Job</Text>
          <View style={styles.heroCtaArrow}>
            <Ionicons name="arrow-forward" size={15} color={C.navy} />
          </View>
        </TouchableOpacity>

        {/* stat pills */}
        <View style={styles.statsRow}>
          {[
            { icon: "star",             label: "4.9 Rating" },
            { icon: "people",           label: "12k+ Pros" },
            { icon: "shield-checkmark", label: "Verified" },
          ].map((s) => (
            <View key={s.label} style={styles.statPill}>
              <Ionicons name={s.icon as any} size={12} color={C.textMuted} />
              <Text style={styles.statText}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── MODAL ── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalRoot}>

          {/* header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.iconBtn}>
              <Ionicons name="close" size={18} color={C.textNavy} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Post Job Request</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* progress bar */}
          <View style={styles.progressRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
            ))}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
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
              <Text style={styles.chipGroupLabel}>Quick select</Text>
              <View style={styles.chipRow}>
                {["Plumbing", "Electrical", "Cleaning"].map((service) => {
                  const active = formData.selectedServices.includes(service)
                  return (
                    <TouchableOpacity
                      key={service}
                      onPress={() => handleServiceToggle(service)}
                      style={[styles.chip, active && styles.chipActive]}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {service}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </Card>

            {/* TIMELINE */}
            <Card title="Timeline">
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Field
                    label="Start date"
                    icon="calendar-outline"
                    placeholder="mm/dd/yyyy"
                    value={formData.startDate}
                    onChangeText={(t: string) => updateFormData({ startDate: t })}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
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
                { key: "Any Specialist",  desc: "We'll match you automatically",  icon: "people-outline"   },
                { key: "Top Rated",       desc: "Highest reviewed professionals",  icon: "star-outline"     },
                { key: "Most Affordable", desc: "Lowest cost options",             icon: "pricetag-outline" },
              ].map((choice) => {
                const active = formData.specialistChoice === choice.key
                return (
                  <TouchableOpacity
                    key={choice.key}
                    onPress={() => updateFormData({ specialistChoice: choice.key })}
                    style={[styles.specialistRow, active && styles.specialistRowActive]}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.specialistIcon, active && styles.specialistIconActive]}>
                      <Ionicons
                        name={choice.icon as any}
                        size={17}
                        color={active ? C.white : C.textSub}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.specialistLabel, active && { color: C.navy }]}>
                        {choice.key}
                      </Text>
                      <Text style={styles.specialistDesc}>{choice.desc}</Text>
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={20} color={C.navy} />
                    )}
                  </TouchableOpacity>
                )
              })}
            </Card>

            {/* ADDITIONAL INFO */}
            <Card title="Additional Details">
              <Text style={styles.fieldLabel}>Describe your task</Text>
              <View style={styles.textAreaWrap}>
                <TextInput
                  placeholder="Include relevant details about location, timing, or special requirements..."
                  placeholderTextColor={C.placeholder}
                  value={formData.additionalInfo}
                  onChangeText={(t) => updateFormData({ additionalInfo: t })}
                  multiline
                  numberOfLines={4}
                  style={styles.textArea}
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
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Text style={styles.submitText}>Post Job Request</Text>
                  <Ionicons name="send" size={15} color={C.white} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.entryBg,
  },

  // ── Entry (dark) ──────────────────────────────────────────────
  entryWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: C.navyGhost,
    top: -110,
    right: -130,
    opacity: 0.45,
  },
  circle2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: C.navyGhost,
    bottom: 50,
    left: -80,
    opacity: 0.35,
  },

  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 8,
  },
  logoQ: {
    fontSize: 30,
    fontWeight: "900",
    color: C.navyDark,
    letterSpacing: -1,
    lineHeight: 36,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: C.navyMid,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    marginBottom: 20,
    gap: 7,
    borderWidth: 1,
    borderColor: C.navyLight,
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#4ADE80",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textMuted,
    letterSpacing: 0.4,
  },

  heroTitle: {
    fontSize: 42,
    fontWeight: "800",
    color: C.textLight,
    lineHeight: 50,
    letterSpacing: -1.2,
    marginBottom: 14,
  },
  heroSub: {
    fontSize: 15,
    color: C.textMuted,
    lineHeight: 23,
    marginBottom: 36,
    maxWidth: 310,
  },

  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: C.textLight,
    paddingVertical: 14,
    paddingLeft: 22,
    paddingRight: 14,
    borderRadius: 100,
    gap: 10,
    marginBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  heroCtaText: {
    color: C.navy,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  heroCtaArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.navyMid,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 100,
    gap: 5,
    borderWidth: 1,
    borderColor: C.navyLight,
  },
  statText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: "600",
  },

  // ── Modal ─────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    backgroundColor: C.modalBg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.modalBg,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textNavy,
    letterSpacing: -0.3,
  },
  progressRow: {
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: C.surface,
  },
  dot: {
    height: 3,
    flex: 1,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  dotActive: {
    backgroundColor: C.navy,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 12,
  },

  // ── Card ──────────────────────────────────────────────────────
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardAccentBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.navy,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textNavy,
    letterSpacing: -0.2,
  },

  // ── Field ─────────────────────────────────────────────────────
  fieldWrap: { gap: 6 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.modalBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  inputRowFocused: {
    borderColor: C.navy,
    backgroundColor: "#F5FBF8",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.textNavy,
    padding: 0,
  },

  // ── Chips ─────────────────────────────────────────────────────
  chipGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSub,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: C.modalBg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSub,
  },
  chipTextActive: {
    color: C.white,
  },

  // ── Row ───────────────────────────────────────────────────────
  row: { flexDirection: "row" },

  // ── Specialist ────────────────────────────────────────────────
  specialistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.modalBg,
  },
  specialistRowActive: {
    borderColor: C.navy,
    backgroundColor: C.accentSoft,
  },
  specialistIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  specialistIconActive: {
    backgroundColor: C.navy,
    borderColor: C.navy,
  },
  specialistLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textNavy,
    marginBottom: 2,
  },
  specialistDesc: {
    fontSize: 12,
    color: C.textSub,
  },

  // ── Text area ─────────────────────────────────────────────────
  textAreaWrap: {
    backgroundColor: C.modalBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: {
    fontSize: 14,
    color: C.textNavy,
    minHeight: 96,
  },

  // ── Footer ────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  submitBtn: {
    backgroundColor: C.navy,
    borderRadius: 100,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.navyDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  submitText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
})