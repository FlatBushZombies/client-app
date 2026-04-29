import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { ConversationChatScreen } from "@/components/messaging/ConversationChatScreen";
import { useMessagingConversations } from "@/hooks/useMessagingConversations";
import { API_BASE_URL } from "@/lib/fetch";

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
        <View style={styles.centered}>
          <ActivityIndicator />
          <Text style={styles.helper}>Loading your account...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.replace("/(root)/chat")}
            style={styles.backButton}
          >
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.conversationId}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 48,
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
    gap: 12,
    marginBottom: 12,
  },
  backButton: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  search: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: "#0F172A",
  },
  row: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 10,
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
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 20,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#64748B",
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  refreshLabel: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
