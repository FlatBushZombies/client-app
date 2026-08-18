import { useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as Haptics from "expo-haptics"
import { useAuth } from "@clerk/clerk-expo"
import { COLORS, SHADOW } from "@/constants/theme"
import { RADIUS, SPACING, SCREEN_PADDING } from "@/constants/layout"
import { fetchWithRetry, getApiUrl } from "@/lib/fetch"
import { waitForClerkToken } from "@/lib/session"
import { showErrorToast } from "@/lib/toast"

const { width: SCREEN_WIDTH } = Dimensions.get("window")
const GRID_GAP = SPACING.sm
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING.content * 2 - GRID_GAP) / 2

// A deliberate departure from the app's green brand for this one screen —
// a portfolio profile is a personal showcase moment, styled to spec.
const HERO_GRADIENT = ["#DDE4FB", "#B9C7F4"] as const
const HERO_BLOB = "rgba(58, 91, 214, 0.28)"
const HERO_BLOB_SOFT = "rgba(58, 91, 214, 0.16)"
const HERO_INK = "#1B2559"
const HERO_INK_MUTED = "rgba(27, 37, 89, 0.62)"

interface ReviewSummary {
  averageRating: number
  reviewCount: number
}

interface PortfolioMedia {
  id: number
  url: string
  sortOrder: number
}

interface PortfolioProject {
  id: number
  title: string
  description: string | null
  category: string | null
  skills: string | null
  projectUrl: string | null
  media: PortfolioMedia[]
}

interface Testimonial {
  reviewerName: string
  rating: number
  comment: string
  createdAt: string
}

interface SpecialistInfo {
  clerkId: string
  name: string
  imageUrl: string | null
  skills: string | null
  experienceLevel: string | null
  hourlyRate: number | null
  reviewSummary: ReviewSummary
}

type LoadState = "loading" | "ready" | "not_found" | "error"

function buildHeadline(skills: string | null) {
  if (!skills) return "Independent Specialist"
  const parts = skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2)
  if (parts.length === 0) return "Independent Specialist"
  return `${parts.join(" & ")} Specialist`
}

function buildDescriptor(specialist: SpecialistInfo) {
  const parts: string[] = []
  if (specialist.experienceLevel) parts.push(specialist.experienceLevel)
  if (specialist.reviewSummary.reviewCount > 0) {
    parts.push(
      `${specialist.reviewSummary.averageRating.toFixed(1)}★ from ${specialist.reviewSummary.reviewCount} client${specialist.reviewSummary.reviewCount === 1 ? "" : "s"}`
    )
  }
  if (specialist.hourlyRate) parts.push(`$${specialist.hourlyRate}/hr`)
  return parts.join("  ·  ")
}

export default function SpecialistPortfolioScreen() {
  const params = useLocalSearchParams<{ clerkId: string; displayName?: string; imageUrl?: string }>()
  const { getToken } = useAuth()
  const insets = useSafeAreaInsets()
  const clerkId = params.clerkId

  const [loadState, setLoadState] = useState<LoadState>("loading")
  const [specialist, setSpecialist] = useState<SpecialistInfo | null>(null)
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [messaging, setMessaging] = useState(false)
  const viewRecordedForRef = useRef<string | null>(null)

  const fetchPortfolio = async () => {
    if (!clerkId) return
    setLoadState("loading")
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetchWithRetry(getApiUrl(`/api/portfolio/${clerkId}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (response.status === 404) {
        setLoadState("not_found")
        return
      }

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load portfolio")
      }

      setSpecialist(data.data.specialist)
      setProjects(Array.isArray(data.data.projects) ? data.data.projects : [])
      setTestimonials(Array.isArray(data.data.testimonials) ? data.data.testimonials : [])
      setLoadState("ready")
    } catch (error) {
      console.error("[Portfolio] fetch error", error)
      setLoadState("error")
    }
  }

  useEffect(() => {
    void fetchPortfolio()
  }, [clerkId])

  // Records exactly one view per screen visit, guarded against re-renders —
  // the backend independently dedupes repeat opens within a time window, but
  // this avoids firing a redundant request on every re-render regardless.
  useEffect(() => {
    if (!clerkId || loadState !== "ready" || viewRecordedForRef.current === clerkId) {
      return
    }
    viewRecordedForRef.current = clerkId

    ;(async () => {
      try {
        const token = await waitForClerkToken(getToken)
        await fetch(getApiUrl(`/api/portfolio/${clerkId}/views`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({}),
        })
      } catch (error) {
        console.error("[Portfolio] view record error", error)
      }
    })()
  }, [clerkId, loadState])

  const openProject = (index: number) => {
    void Haptics.selectionAsync()
    setSelectedIndex(index)
    setImageIndex(0)
  }

  const closeDetail = () => setSelectedIndex(null)

  const goToProject = (direction: "prev" | "next") => {
    if (selectedIndex === null) return
    const nextIndex = direction === "next" ? selectedIndex + 1 : selectedIndex - 1
    if (nextIndex < 0 || nextIndex >= projects.length) return
    void Haptics.selectionAsync()
    setSelectedIndex(nextIndex)
    setImageIndex(0)
  }

  const messageSpecialist = async () => {
    if (!clerkId || messaging) return
    setMessaging(true)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    try {
      const token = await waitForClerkToken(getToken)
      const response = await fetch(getApiUrl(`/api/messaging/conversation-with/${clerkId}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to open conversation")
      }
      router.push({
        pathname: "/(root)/chat",
        params: { conversationId: data.conversationId, otherClerkId: clerkId, otherDisplayName: displayName },
      })
    } catch (error) {
      showErrorToast("Couldn't open chat", error instanceof Error ? error.message : "Please try again.")
    } finally {
      setMessaging(false)
    }
  }

  const selectedProject = selectedIndex !== null ? projects[selectedIndex] : null
  const displayName = specialist?.name || params.displayName || "Specialist"
  const imageUrl = specialist?.imageUrl || params.imageUrl || null

  return (
    <SafeAreaView style={st.root} edges={selectedProject || loadState !== "ready" ? ["top"] : []}>
      {selectedProject ? (
        <View style={st.header}>
          <TouchableOpacity onPress={closeDetail} style={st.headerBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={st.headerTitle} numberOfLines={1}>{selectedProject.title}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={() => goToProject("prev")}
              disabled={selectedIndex === 0}
              style={[st.headerBtn, { opacity: selectedIndex === 0 ? 0.3 : 1 }]}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => goToProject("next")}
              disabled={selectedIndex === projects.length - 1}
              style={[st.headerBtn, { opacity: selectedIndex === projects.length - 1 ? 0.3 : 1 }]}
            >
              <Ionicons name="arrow-forward" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {loadState === "loading" ? (
        <View style={st.centerFill}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={st.mutedText}>Loading portfolio...</Text>
        </View>
      ) : loadState === "not_found" ? (
        <View style={st.centerFill}>
          <Ionicons name="person-outline" size={40} color={COLORS.textMuted} />
          <Text style={st.emptyTitle}>Specialist not found</Text>
        </View>
      ) : loadState === "error" ? (
        <View style={st.centerFill}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.textMuted} />
          <Text style={st.emptyTitle}>Couldn't load this portfolio</Text>
          <TouchableOpacity onPress={fetchPortfolio} style={st.retryBtn} activeOpacity={0.85}>
            <Text style={st.retryBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : selectedProject ? (
        <ScrollView contentContainerStyle={{ paddingBottom: SPACING.xxl }} showsVerticalScrollIndicator={false}>
          {selectedProject.media.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
              >
                {selectedProject.media.map((media) => (
                  <Image key={media.id} source={{ uri: media.url }} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }} resizeMode="cover" />
                ))}
              </ScrollView>
              {selectedProject.media.length > 1 ? (
                <View style={st.dotsRow}>
                  {selectedProject.media.map((media, i) => (
                    <View key={media.id} style={[st.dot, i === imageIndex && st.dotActive]} />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={[st.centerFill, { height: SCREEN_WIDTH }]}>
              <Ionicons name="image-outline" size={36} color={COLORS.textMuted} />
            </View>
          )}

          <View style={{ padding: SCREEN_PADDING.content }}>
            <Text style={st.detailTitle}>{selectedProject.title}</Text>

            {selectedProject.category ? (
              <View style={st.categoryChip}>
                <Text style={st.categoryChipText}>{selectedProject.category}</Text>
              </View>
            ) : null}

            {selectedProject.description ? <Text style={st.detailBody}>{selectedProject.description}</Text> : null}

            {selectedProject.skills ? (
              <View style={st.skillsRow}>
                {selectedProject.skills.split(",").map((s) => s.trim()).filter(Boolean).map((skill) => (
                  <View key={skill} style={st.skillChip}>
                    <Text style={st.skillChipText}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {selectedProject.projectUrl ? (
              <View style={st.linkRow}>
                <Ionicons name="link-outline" size={14} color={COLORS.primary} />
                <Text style={st.linkText} numberOfLines={1}>
                  {selectedProject.projectUrl}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xxl }}>
          {/* ── Hero ── */}
          <LinearGradient colors={HERO_GRADIENT} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={[st.hero, { paddingTop: insets.top + SPACING.md }]}>
            <View style={[st.heroBlob, st.heroBlobTopRight]} />
            <View style={[st.heroBlob, st.heroBlobTopRight2]} />
            <View style={[st.heroBlob, st.heroBlobBottomLeft]} />

            <TouchableOpacity onPress={() => router.back()} style={st.heroBackBtn} activeOpacity={0.75}>
              <Ionicons name="close" size={18} color={HERO_INK} />
            </TouchableOpacity>

            <View style={st.heroIdentityRow}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={st.heroAvatar} />
              ) : (
                <View style={st.heroAvatarFallback}>
                  <Text style={st.heroAvatarFallbackText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <Text style={st.heroName} numberOfLines={1}>{displayName}</Text>
            </View>

            <Text style={st.heroHeadline}>{buildHeadline(specialist?.skills ?? null)}</Text>

            {specialist ? <Text style={st.heroDescriptor}>{buildDescriptor(specialist)}</Text> : null}

            <TouchableOpacity onPress={messageSpecialist} disabled={messaging} style={st.heroCta} activeOpacity={0.85}>
              {messaging ? (
                <ActivityIndicator size="small" color={HERO_INK} />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={16} color={HERO_INK} />
                  <Text style={st.heroCtaText}>Message {displayName.split(" ")[0]}</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>

          {/* ── Testimonials ── */}
          {testimonials.length > 0 ? (
            <View style={st.section}>
              <View style={st.sectionHeadingRow}>
                <Ionicons name="chatbox-ellipses" size={16} color={COLORS.textPrimary} />
                <Text style={st.sectionHeading}>Testimonials</Text>
              </View>
              <View style={{ gap: SPACING.sm }}>
                {testimonials.map((testimonial, index) => (
                  <View key={`${testimonial.reviewerName}-${index}`} style={st.testimonialCard}>
                    <View style={st.testimonialTopRow}>
                      <View style={st.testimonialAvatar}>
                        <Text style={st.testimonialAvatarText}>{testimonial.reviewerName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={st.testimonialName}>{testimonial.reviewerName}</Text>
                        <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons
                              key={i}
                              name={i < testimonial.rating ? "star" : "star-outline"}
                              size={11}
                              color="#B45309"
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={st.testimonialQuote}>“{testimonial.comment}”</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* ── Projects ── */}
          <View style={st.section}>
            <View style={st.sectionHeadingRow}>
              <Ionicons name="briefcase" size={16} color={COLORS.textPrimary} />
              <Text style={st.sectionHeading}>Projects</Text>
            </View>

            {projects.length === 0 ? (
              <View style={st.emptyCard}>
                <Ionicons name="images-outline" size={32} color={COLORS.textMuted} />
                <Text style={st.emptyTitle}>No portfolio projects yet</Text>
                <Text style={st.emptyBody}>{displayName} hasn't added any work to their portfolio yet.</Text>
              </View>
            ) : (
              <View style={st.grid}>
                {projects.map((project, index) => (
                  <TouchableOpacity key={project.id} onPress={() => openProject(index)} activeOpacity={0.85} style={st.gridItem}>
                    {project.media[0]?.url ? (
                      <Image source={{ uri: project.media[0].url }} style={st.gridImage} resizeMode="cover" />
                    ) : (
                      <View style={[st.gridImage, st.centerFill]}>
                        <Ionicons name="image-outline" size={22} color={COLORS.textMuted} />
                      </View>
                    )}
                    <View style={{ padding: SPACING.xs }}>
                      <Text style={st.gridTitle} numberOfLines={1}>{project.title}</Text>
                      {project.category ? <Text style={st.gridCategory} numberOfLines={1}>{project.category}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_PADDING.content,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginHorizontal: SPACING.sm,
  },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xxl, gap: SPACING.xs },
  mutedText: { color: COLORS.textSecondary, fontSize: 13 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary, textAlign: "center" },
  emptyBody: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 19 },
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.xs,
  },
  retryBtn: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  retryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },

  /* Hero */
  hero: {
    paddingHorizontal: SCREEN_PADDING.content,
    paddingBottom: SPACING.xxl,
    overflow: "hidden",
  },
  heroBlob: { position: "absolute", borderRadius: 999 },
  heroBlobTopRight: { width: 260, height: 260, top: -110, right: -80, backgroundColor: HERO_BLOB },
  heroBlobTopRight2: { width: 160, height: 160, top: 20, right: -60, backgroundColor: HERO_BLOB_SOFT },
  heroBlobBottomLeft: { width: 220, height: 220, bottom: -100, left: -90, backgroundColor: HERO_BLOB_SOFT },
  heroBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
    marginBottom: SPACING.md,
  },
  heroIdentityRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: SPACING.lg },
  heroAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.8)" },
  heroAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HERO_INK,
    alignItems: "center",
    justifyContent: "center",
  },
  heroAvatarFallbackText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  heroName: { fontSize: 15, fontWeight: "700", color: HERO_INK },
  heroHeadline: { fontSize: 30, fontWeight: "800", color: HERO_INK, lineHeight: 36, marginBottom: SPACING.sm },
  heroDescriptor: { fontSize: 14, color: HERO_INK_MUTED, lineHeight: 20, marginBottom: SPACING.lg },
  heroCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 2,
    ...SHADOW.raised,
  },
  heroCtaText: { fontSize: 15, fontWeight: "700", color: HERO_INK },

  /* Sections */
  section: { paddingHorizontal: SCREEN_PADDING.content, paddingTop: SPACING.xl },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: SPACING.md },
  sectionHeading: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },

  testimonialCard: {
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceMuted,
    padding: SPACING.md,
  },
  testimonialTopRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: SPACING.xs },
  testimonialAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: { fontSize: 13, fontWeight: "800", color: COLORS.primaryDark },
  testimonialName: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  testimonialQuote: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    ...SHADOW.card,
  },
  gridImage: { width: "100%", height: GRID_ITEM_WIDTH, backgroundColor: COLORS.surfaceMuted },
  gridTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  gridCategory: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: SPACING.sm },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
  dotActive: { backgroundColor: COLORS.primary },

  detailTitle: { fontSize: 21, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SPACING.xs },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginBottom: SPACING.sm,
  },
  categoryChipText: { fontSize: 12, fontWeight: "700", color: COLORS.primaryDark },
  detailBody: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21, marginBottom: SPACING.sm },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginBottom: SPACING.sm },
  skillChip: {
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 5,
  },
  skillChipText: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  linkText: { fontSize: 13, color: COLORS.primaryDark, fontWeight: "600" },
})
