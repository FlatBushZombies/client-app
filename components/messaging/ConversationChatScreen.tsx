import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { API_BASE_URL } from "@/lib/fetch";
import { useMessagingSocket, type ServerMessage } from "@/hooks/useMessagingSocket";
import { SPACING, RADIUS } from "@/constants/layout";
import { COLORS, SHADOW } from "@/constants/theme";

const CLIENT_TAGS = [
  { kind: "ready-for-visit", label: "Ready for visit", icon: "home-outline" as const },
  { kind: "please-call", label: "Please call", icon: "call-outline" as const },
  { kind: "share-location", label: "Location shared", icon: "location-outline" as const },
  { kind: "need-quote-update", label: "Need quote update", icon: "pricetag-outline" as const },
  { kind: "confirm-arrival", label: "Confirm arrival", icon: "calendar-outline" as const },
];

type Props = {
  clerkUserId: string;
  conversationId: string;
  otherDisplayName?: string;
  otherAvatarUrl?: string | null;
  jobTitle?: string;
};

type ParsedCard = {
  kind: string;
  label: string;
  note: string | null;
};

function getInitials(name?: string) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function parseCard(text: string): ParsedCard | null {
  const normalized = String(text || "").trim();
  if (!normalized.startsWith("QH_CARD::")) return null;
  try {
    const parsed = JSON.parse(normalized.slice("QH_CARD::".length));
    if (!parsed?.label) return null;
    return {
      kind: String(parsed.kind || "update"),
      label: String(parsed.label),
      note: parsed.note ? String(parsed.note) : null,
    };
  } catch {
    return null;
  }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function cardKind(message: ServerMessage) {
  return parseCard(message.text)?.kind ?? null;
}

// Consecutive messages from the same sender are visually grouped (like a
// normal chat app) — a system card always breaks the group on both sides.
function breaksGroup(a: ServerMessage, b: ServerMessage) {
  return (
    a.senderId !== b.senderId ||
    cardKind(a) === "application-submitted" ||
    cardKind(b) === "application-submitted"
  );
}

function kindIcon(kind: string): keyof typeof Ionicons.glyphMap {
  const tag = CLIENT_TAGS.find((t) => t.kind === kind);
  return tag?.icon ?? "flag-outline";
}

export function ConversationChatScreen({
  clerkUserId,
  conversationId,
  otherDisplayName,
  otherAvatarUrl,
}: Props) {
  const { getToken } = useAuth();
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendingTag, setSendingTag] = useState<string | null>(null);

  const { messages, sendMessage, loadingHistory, lastError } = useMessagingSocket({
    serverUrl: API_BASE_URL,
    apiBaseUrl: API_BASE_URL,
    getToken,
    conversationId,
    enabled: true,
  });

  const sendChatMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await sendMessage({ label: trimmed });
      setMessageText("");
    } finally {
      setSending(false);
    }
  };

  const sendQuickTag = async (tag: { kind: string; label: string }) => {
    if (sendingTag) return;
    setSendingTag(tag.kind);
    try {
      await sendMessage({ tag: tag.kind, label: tag.label });
    } finally {
      setSendingTag(null);
    }
  };

  return (
    <View style={styles.container}>
      {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.timeline}
        renderItem={({ item, index }) => {
          const card = parseCard(item.text);
          const isMine = item.senderId === clerkUserId;

          if (card?.kind === "application-submitted") {
            return (
              <View style={styles.systemPill}>
                <Ionicons name="briefcase-outline" size={13} color={COLORS.textSecondary} />
                <Text style={styles.systemPillText}>
                  {"New Application · "}
                  {isMine ? "You applied for this job." : `${item.senderName || "A freelancer"} applied for this job.`}
                  {" · "}
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            );
          }

          const startsGroup = index === 0 || breaksGroup(messages[index - 1], item);
          const endsGroup =
            index === messages.length - 1 || breaksGroup(item, messages[index + 1]);
          const isPlainMessage = !card || card.kind === "message";

          return (
            <View style={{ marginTop: startsGroup ? 14 : 3 }}>
              {!isMine && startsGroup ? (
                <Text style={styles.senderName}>{otherDisplayName || item.senderName || "Other user"}</Text>
              ) : null}

              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.messageRowMine : styles.messageRowOther,
                ]}
              >
                {!isMine ? (
                  <View style={styles.avatarSlot}>
                    {endsGroup ? (
                      otherAvatarUrl ? (
                        <Image source={{ uri: otherAvatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {getInitials(otherDisplayName || item.senderName)}
                          </Text>
                        </View>
                      )
                    ) : null}
                  </View>
                ) : null}

                {(() => {
                  const BubbleContainer = isMine ? LinearGradient : View;
                  const bubbleProps = isMine
                    ? { colors: ["#0F766E", "#052E23"] as [string, string], start: { x: 0.1, y: 0 }, end: { x: 0.95, y: 1 } }
                    : {};
                  return (
                    <BubbleContainer
                      {...(bubbleProps as any)}
                      style={[
                        styles.bubble,
                        isMine ? styles.bubbleMine : styles.bubbleOther,
                        isPlainMessage ? null : styles.bubbleTag,
                      ]}
                    >
                      {isPlainMessage ? (
                        <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : null]}>
                          {card?.label ?? item.text}
                        </Text>
                      ) : (
                        <View>
                          <View style={styles.tagRow}>
                            <Ionicons
                              name={kindIcon(card!.kind)}
                              size={14}
                              color={isMine ? COLORS.surface : COLORS.info}
                            />
                            <Text
                              style={[styles.tagLabel, isMine ? styles.bubbleTextMine : null]}
                            >
                              {card!.label}
                            </Text>
                          </View>
                          {card?.note ? (
                            <Text
                              style={[styles.tagNote, isMine ? styles.bubbleTextMine : null]}
                            >
                              {card.note}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </BubbleContainer>
                  );
                })()}
              </View>

              {endsGroup ? (
                <Text style={[styles.timestamp, isMine ? styles.timestampMine : styles.timestampOther]}>
                  {formatTime(item.createdAt)}
                </Text>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          loadingHistory ? (
            <ActivityIndicator style={{ marginTop: 28 }} />
          ) : (
            <Text style={styles.empty}>
              No messages yet. Say hello or send a quick update below.
            </Text>
          )
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickReplies}
        contentContainerStyle={{ gap: SPACING.xs, paddingRight: SPACING.xs }}
      >
        {CLIENT_TAGS.map((tag) => (
          <Pressable
            key={tag.kind}
            onPress={() => sendQuickTag(tag)}
            disabled={sendingTag === tag.kind}
            style={styles.tagChip}
          >
            {sendingTag === tag.kind ? (
              <ActivityIndicator size="small" color={COLORS.info} />
            ) : (
              <>
                <Ionicons name={tag.icon} size={14} color="#334155" />
                <Text style={styles.tagChipText}>{tag.label}</Text>
              </>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message"
          placeholderTextColor={COLORS.textMuted}
          multiline
          style={styles.input}
        />
        <Pressable onPress={sendChatMessage} disabled={sending || !messageText.trim()}>
          {messageText.trim() ? (
            <LinearGradient
              colors={["#059669", "#047857"]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.sendButton}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <Ionicons name="arrow-up" size={19} color={COLORS.surface} />
              )}
            </LinearGradient>
          ) : (
            <View style={[styles.sendButton, styles.sendButtonDisabled]}>
              <Ionicons name="arrow-up" size={19} color="#94A3B8" />
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SPACING.sm },
  error: { color: COLORS.badgeRed, marginBottom: 10 },
  timeline: { paddingBottom: SPACING.sm, flexGrow: 1 },

  systemPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginVertical: 10,
  },
  systemPillText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },

  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginLeft: 40,
    marginBottom: 4,
  },
  messageRow: { flexDirection: "row", alignItems: "flex-end", gap: SPACING.xs },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  avatarSlot: { width: 28, alignItems: "center" },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.info,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 10, fontWeight: "700", color: "#FFFFFF" },

  bubble: {
    maxWidth: "76%",
    borderRadius: RADIUS.xl,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  bubbleMine: {
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: { shadowColor: "#047857", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  bubbleOther: {
    backgroundColor: "#F1F5F9",
    borderBottomLeftRadius: 6,
  },
  bubbleTag: { borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  bubbleTextMine: { color: COLORS.surface },

  tagRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tagLabel: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  tagNote: { marginTop: 4, fontSize: 13, lineHeight: 18, color: "#475569" },

  timestamp: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  timestampMine: { alignSelf: "flex-end", marginRight: 2 },
  timestampOther: { alignSelf: "flex-start", marginLeft: 40 },

  empty: { textAlign: "center", color: COLORS.textSecondary, marginTop: SPACING.xl, lineHeight: 20 },

  quickReplies: { flexGrow: 0, marginBottom: SPACING.sm },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 2,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    ...SHADOW.card,
  },
  tagChipText: { color: "#334155", fontWeight: "600", fontSize: 12 },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    fontSize: 15,
    ...SHADOW.card,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  sendButtonDisabled: { backgroundColor: "#E2E8F0" },
});
