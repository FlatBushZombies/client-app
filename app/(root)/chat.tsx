import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { ConversationChatScreen } from "@/components/messaging/ConversationChatScreen";
import { useMessagingConversations } from "@/hooks/useMessagingConversations";
import { API_BASE_URL } from "@/lib/fetch";
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout";
import { COLORS, SHADOW } from "@/constants/theme";

// Warm pastel accent trio for fallback-initial avatars — rotates per person
// so the list stays visually varied without leaving the warm palette.
const AVATAR_ACCENTS: { bg: string; ring: string; text: string }[] = [
  { bg: COLORS.primarySoft, ring: COLORS.primary, text: COLORS.primaryDark },
  { bg: COLORS.accentPurpleSoft, ring: COLORS.accentPurple, text: COLORS.accentPurple },
  { bg: COLORS.accentAmberSoft, ring: COLORS.accentAmber, text: COLORS.accentAmber },
];

function getInitials(name?: string | null) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarAccent(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_ACCENTS[hash % AVATAR_ACCENTS.length];
}

function getMessagePreview(text: string | null) {
  const normalized = String(text || "").trim();
  if (!normalized.startsWith("QH_CARD::")) return normalized;
  try {
    const parsed = JSON.parse(normalized.slice("QH_CARD::".length));
    return parsed?.label ? String(parsed.label) : normalized;
  } catch {
    return normalized;
  }
}

function formatConversationTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type ConversationRow = {
  conversationId: string;
  jobTitle: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  otherUser: {
    clerkId: string;
    displayName: string;
    imageUrl?: string | null;
  } | null;
};

const ONBOARDING_STEPS = [
  {
    icon: "briefcase-outline" as const,
    title: "Post Your First Job",
    body: "Go to the Jobs tab, describe what you need, set your budget and preferred dates, then submit.",
  },
  {
    icon: "people-outline" as const,
    title: "Review Applications",
    body: "Head to the Tasks tab to see quotes, ratings, and AI-scored spotlights from local professionals.",
  },
  {
    icon: "chatbubble-ellipses-outline" as const,
    title: "Chat & Coordinate",
    body: "Use this Chat tab to message hired pros about job details before they arrive.",
  },
  {
    icon: "checkmark-circle-outline" as const,
    title: "Accept & Track",
    body: "Accept the best quote from the Tasks tab, share your contact details, and track progress.",
  },
  {
    icon: "star-outline" as const,
    title: "Leave a Review",
    body: "After the job is done, leave a rating so other clients can trust the best professionals.",
  },
];

const TIPS = [
  "Enable location for smarter pro matching near you.",
  "Save job templates in the modal for recurring tasks.",
  "Share your phone number only after accepting a quote.",
  "Use the Tasks tab to shortlist multiple candidates before deciding.",
];

function TeamQuickhandsCard() {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <Pressable style={styles.teamCard} onPress={toggle}>
      {/* Header row */}
      <View style={styles.teamHeader}>
        <View style={styles.teamAvatar}>
          <Text style={styles.teamAvatarText}>Q</Text>
        </View>
        <View style={styles.teamHeaderText}>
          <View style={styles.teamNameRow}>
            <Text style={styles.teamName}>Team Quickhands</Text>
            <View style={styles.officialBadge}>
              <Ionicons name="shield-checkmark" size={9} color={COLORS.primary} />
              <Text style={styles.officialBadgeText}>Official</Text>
            </View>
          </View>
          {!expanded && (
            <Text style={styles.teamPreview} numberOfLines={1}>
              Welcome! Tap to get started with QuickHands Now
            </Text>
          )}
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={COLORS.textMuted}
          style={{ marginLeft: 8 }}
        />
      </View>

      {/* Expanded onboarding content */}
      {expanded && (
        <View style={styles.onboardingBody}>
          <Text style={styles.onboardingGreeting}>
            Welcome to QuickHands Now! Here&apos;s how to get the most out of the app.
          </Text>

          <View style={styles.stepsList}>
            {ONBOARDING_STEPS.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepIconWrap}>
                  <Ionicons name={step.icon} size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>
                    {i + 1}. {step.title}
                  </Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.tipsBox}>
            <Text style={styles.tipsHeading}>Quick tips</Text>
            {TIPS.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.supportLine}>
            Need help?{" "}
            <Text style={styles.supportEmail}>support@quickhands.com</Text>
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ChatScreen() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const params = useLocalSearchParams<{
    conversationId?: string;
    otherClerkId?: string;
    otherDisplayName?: string;
    otherAvatarUrl?: string;
    jobTitle?: string;
  }>();

  const [query, setQuery] = useState("");

  const conversationId = params.conversationId;
  const otherClerkId = params.otherClerkId;
  const otherDisplayName = params.otherDisplayName;
  const otherAvatarUrl = params.otherAvatarUrl || null;
  const jobTitle = params.jobTitle;

  const {
    conversations,
    loading,
    error,
    refresh,
  } = useMessagingConversations({
    apiUrl: API_BASE_URL,
    getToken,
    enabled: isLoaded && !!isSignedIn && !!userId,
  });

  const filteredConversations = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const name = conversation.otherUser?.displayName?.toLowerCase() || "";
      const title = conversation.jobTitle?.toLowerCase() || "";
      return name.includes(normalizedQuery) || title.includes(normalizedQuery);
    });
  }, [conversations, query]);

  const openConversation = (conversation: ConversationRow) => {
    router.push({
      pathname: "/(root)/chat",
      params: {
        conversationId: conversation.conversationId,
        otherClerkId: conversation.otherUser?.clerkId,
        otherDisplayName: conversation.otherUser?.displayName,
        ...(conversation.otherUser?.imageUrl ? { otherAvatarUrl: conversation.otherUser.imageUrl } : {}),
        ...(conversation.jobTitle ? { jobTitle: conversation.jobTitle } : {}),
      },
    });
  };

  if (conversationId) {
    if (!isLoaded || !isSignedIn || !userId) {
      return (
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={[styles.helper, { marginTop: SPACING.sm }]}>Loading your account...</Text>
        </SafeAreaView>
      );
    }

    const threadAvatarAccent = getAvatarAccent(otherDisplayName || conversationId);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.replace("/(root)/chat")}
            style={styles.backButton}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.threadAvatarWrap}>
            {otherAvatarUrl ? (
              <Image source={{ uri: otherAvatarUrl }} style={styles.threadAvatar} />
            ) : (
              <View
                style={[
                  styles.threadAvatar,
                  styles.threadAvatarFallback,
                  { backgroundColor: threadAvatarAccent.bg, borderColor: threadAvatarAccent.ring },
                ]}
              >
                <Text style={[styles.threadAvatarText, { color: threadAvatarAccent.text }]}>
                  {getInitials(otherDisplayName)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{otherDisplayName || "Chat"}</Text>
            <Text style={styles.helper} numberOfLines={1}>{jobTitle || "Active conversation"}</Text>
          </View>

          {otherClerkId ? (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(root)/specialist/[clerkId]",
                  params: { clerkId: otherClerkId, displayName: otherDisplayName, imageUrl: otherAvatarUrl || undefined },
                })
              }
              style={styles.backButton}
              activeOpacity={0.75}
            >
              <Ionicons name="images-outline" size={16} color={COLORS.textPrimary} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ConversationChatScreen
          clerkUserId={userId}
          conversationId={conversationId}
          otherDisplayName={otherDisplayName}
          otherAvatarUrl={otherAvatarUrl}
          jobTitle={jobTitle}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.listHeader}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>Messages</Text>
        </View>
        <Text style={styles.pageTitle}>Chat</Text>
        <Text style={styles.helper}>
          Coordinate directly with specialists on your active tasks.
        </Text>
      </View>

      <View style={styles.searchDock}>
        <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by specialist or job"
          placeholderTextColor={COLORS.textMuted}
          style={styles.search}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {!isLoaded || !isSignedIn ? (
        <Text style={styles.helper}>Sign in to view your conversations.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: SPACING.xl }}
          ListHeaderComponent={<TeamQuickhandsCard />}
          renderItem={({ item }) => {
            const name = item.otherUser?.displayName || "Specialist";
            const accent = getAvatarAccent(item.otherUser?.clerkId || item.conversationId);
            const hasUnread = item.unreadCount > 0;
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => openConversation(item)}
              >
                <View>
                  {item.otherUser?.imageUrl ? (
                    <Image source={{ uri: item.otherUser.imageUrl }} style={styles.rowAvatar} />
                  ) : (
                    <View
                      style={[
                        styles.rowAvatar,
                        styles.rowAvatarFallback,
                        { backgroundColor: accent.bg, borderColor: accent.ring },
                      ]}
                    >
                      <Text style={[styles.rowAvatarText, { color: accent.text }]}>{getInitials(name)}</Text>
                    </View>
                  )}
                  {hasUnread ? <View style={styles.unreadDot} /> : null}
                </View>

                <View style={{ flex: 1 }}>
                  <View style={styles.rowTopLine}>
                    <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.time, hasUnread && styles.timeUnread]}>{formatConversationTime(item.lastMessageAt)}</Text>
                  </View>
                  <Text style={[styles.sub, hasUnread && styles.subUnread]} numberOfLines={1}>
                    {getMessagePreview(item.lastMessageText) || item.jobTitle || "Open conversation"}
                  </Text>
                  {item.jobTitle ? (
                    <View style={styles.jobChip}>
                      <Text style={styles.jobChipText} numberOfLines={1}>{item.jobTitle}</Text>
                    </View>
                  ) : null}
                </View>

                {hasUnread ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <LinearGradient
                  colors={["#ECFDF5", "#D1FAE5"]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={styles.emptyIconGradient}
                >
                  <Ionicons name="chatbubbles-outline" size={36} color={COLORS.primary} />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptyText}>
                Accept or apply to a job and your chat with that specialist will appear here.
              </Text>
              <TouchableOpacity onPress={() => refresh()} style={styles.refreshButton} activeOpacity={0.85}>
                <Text style={styles.refreshLabel}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SCREEN_PADDING.content,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  helper: {
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  listHeader: {
    marginBottom: SPACING.md,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    color: COLORS.primary,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
    letterSpacing: -0.7,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.card,
  },
  threadAvatarWrap: {
    ...SHADOW.card,
  },
  threadAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
  },
  threadAvatarFallback: {
    borderWidth: 2,
  },
  threadAvatarText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  searchDock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.card,
  },
  search: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    padding: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  rowAvatarFallback: {
    borderWidth: 2,
  },
  rowAvatarText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  rowTopLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.xs,
    marginBottom: 2,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  nameUnread: {
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  subUnread: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  time: {
    fontSize: 11.5,
    fontWeight: "500",
    color: COLORS.textMuted,
  },
  timeUnread: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  unreadDot: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  jobChip: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    marginTop: 5,
  },
  jobChipText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: COLORS.primaryDark,
  },
  error: {
    color: COLORS.badgeRed,
    marginBottom: 12,
  },
  emptyCard: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: "center",
    ...SHADOW.card,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 30,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  emptyIconGradient: {
    width: 84,
    height: 84,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.14)",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs / 2,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  refreshButton: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs + 4,
  },
  refreshLabel: {
    color: COLORS.surface,
    fontWeight: "700",
  },

  // ── Team Quickhands card ──────────────────────────────────────────────────────
  teamCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: SPACING.sm,
    overflow: "hidden",
    ...SHADOW.card,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  teamAvatar: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: "#064E3B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  teamAvatarText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#6EE7B7",
    lineHeight: 24,
  },
  teamHeaderText: {
    flex: 1,
  },
  teamNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: COLORS.primarySoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  teamPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Onboarding body
  onboardingBody: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0FDF4",
  },
  onboardingGreeting: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 14,
  },
  stepsList: {
    gap: 12,
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  stepIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  stepBody: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  tipsBox: {
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: RADIUS.sm,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  tipsHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  supportLine: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  supportEmail: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
