import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { ConversationChatScreen } from "@/components/messaging/ConversationChatScreen";
import { useMessagingConversations } from "@/hooks/useMessagingConversations";
import { API_BASE_URL } from "@/lib/fetch";
import { SCREEN_PADDING, RADIUS, SPACING } from "@/constants/layout";

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
              <Ionicons name="shield-checkmark" size={9} color="#059669" />
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
          color="#94A3B8"
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
                  <Ionicons name={step.icon} size={16} color="#059669" />
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
    jobTitle?: string;
  }>();

  const [query, setQuery] = useState("");

  const conversationId = params.conversationId;
  const otherDisplayName = params.otherDisplayName;
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

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.replace("/(root)/chat")}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color="#334155" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Coordination Board</Text>
            <Text style={styles.helper}>Simple status updates only</Text>
          </View>
        </View>
        <ConversationChatScreen
          clerkUserId={userId}
          conversationId={conversationId}
          otherDisplayName={otherDisplayName}
          jobTitle={jobTitle}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Coordination Boards</Text>
      <Text style={styles.helper}>
        Each board shows the latest status and the next action for a job.
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Filter by freelancer or job"
        placeholderTextColor="#94A3B8"
        style={styles.search}
      />

      {!isLoaded || !isSignedIn ? (
        <Text style={styles.helper}>Sign in to view your boards.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="small" style={{ marginTop: SPACING.xl }} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
          ListHeaderComponent={<TeamQuickhandsCard />}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => openConversation(item)}>
              <Text style={styles.name}>{item.otherUser?.displayName || "Coordination board"}</Text>
              <Text style={styles.sub}>{item.jobTitle || "Open board"}</Text>
              <Text style={styles.time}>
                {item.lastMessageAt
                  ? new Date(item.lastMessageAt).toLocaleDateString()
                  : "No status yet"}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="chatbubbles-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No boards yet</Text>
              <Text style={styles.emptyText}>
                Accept or apply to a job and the coordination board will appear here.
              </Text>
              <TouchableOpacity onPress={() => refresh()} style={styles.refreshButton}>
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
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  helper: {
    color: "#64748B",
    marginTop: 4,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backButtonText: {
    color: "#334155",
    fontWeight: "600",
    fontSize: 14,
  },
  search: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    color: "#0F172A",
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: "#475569",
  },
  time: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },
  error: {
    color: "#DC2626",
    marginBottom: 12,
  },
  emptyCard: {
    marginTop: SPACING.xl,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: SPACING.xl,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: SPACING.xs / 2,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#64748B",
    marginBottom: SPACING.sm,
  },
  refreshButton: {
    backgroundColor: "#0F172A",
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
  },
  refreshLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // ── Team Quickhands card ──────────────────────────────────────────────────────
  teamCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    marginBottom: SPACING.sm,
    overflow: "hidden",
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  teamAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    color: "#0F172A",
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
    letterSpacing: 0.2,
  },
  teamPreview: {
    fontSize: 13,
    color: "#64748B",
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
    color: "#475569",
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
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  stepBody: {
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  tipsBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  tipsHeading: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
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
    backgroundColor: "#059669",
    marginTop: 6,
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#475569",
  },
  supportLine: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
  supportEmail: {
    color: "#059669",
    fontWeight: "600",
  },
});
