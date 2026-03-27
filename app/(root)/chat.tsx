import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { ConversationChatScreen } from "@/components/messaging/ConversationChatScreen";
import { useMessagingConversations } from "@/hooks/useMessagingConversations";

const DEFAULT_API_URL = "https://quickhands-api.vercel.app";
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL)
  .replace(/\/$/, "")
  .replace(/\/api\/?$/, "");

type SearchUser = {
  clerkId: string;
  displayName: string;
  email: string;
};

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

  const conversationId = params.conversationId;
  const otherDisplayName = params.otherDisplayName;
  const jobTitle = params.jobTitle;

  const [q, setQ] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const {
    conversations,
    loading: loadingConversations,
    error: conversationsError,
    refresh: refreshConversations,
  } = useMessagingConversations({
    apiUrl: API_BASE_URL,
    getToken,
    enabled: isLoaded && !!isSignedIn && !!userId,
  });

  const searchingUsers = q.trim().length > 0;

  const loadUsers = useCallback(async () => {
    if (!q.trim()) {
      setUsers([]);
      setLoadingUsers(false);
      return;
    }

    if (!isLoaded || !isSignedIn || !userId) {
      setLoadingUsers(false);
      setErr("Sign in to use messaging");
      return;
    }

    setLoadingUsers(true);
    setErr(null);

    try {
      const token = await getToken();
      if (!token) {
        setErr("Not signed in");
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/messaging/users?q=${encodeURIComponent(q.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load users");
      }

      setUsers(data.users || []);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Failed to load users");
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [getToken, isLoaded, isSignedIn, q, userId]);

  useEffect(() => {
    if (conversationId) {
      return;
    }

    if (searchingUsers) {
      loadUsers();
      return;
    }

    setUsers([]);
    refreshConversations();
  }, [conversationId, loadUsers, refreshConversations, searchingUsers]);

  const startChat = async (otherClerkId: string, displayName: string) => {
    if (!isLoaded || !isSignedIn || !userId) {
      setErr("Sign in to use messaging");
      return;
    }

    const token = await getToken();
    if (!token) return;

    const response = await fetch(
      `${API_BASE_URL}/api/messaging/conversation-with/${encodeURIComponent(otherClerkId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      setErr(data.message || "Could not open chat");
      return;
    }

    router.push({
      pathname: "/(root)/chat",
      params: {
        conversationId: data.conversationId,
        otherClerkId,
        otherDisplayName: data.otherUser?.displayName ?? displayName,
      },
    });
  };

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

  if (!API_BASE_URL) {
    return (
      <View style={styles.centered}>
        <Text>Set EXPO_PUBLIC_API_URL</Text>
      </View>
    );
  }

  if (conversationId) {
    if (!isLoaded || !isSignedIn || !userId) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator />
          <Text style={styles.empty}>Loading your account...</Text>
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
          <Text style={styles.title}>Messages</Text>
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

  const loading = searchingUsers ? loadingUsers : loadingConversations;
  const errorMessage = err || (!searchingUsers ? conversationsError : null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Messages</Text>
      {!isLoaded || !isSignedIn ? (
        <Text style={styles.empty}>Sign in to load messaging.</Text>
      ) : null}
      <TextInput
        style={styles.search}
        placeholder="Search users to start a chat"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={loadUsers}
        editable={!!isLoaded && !!isSignedIn}
      />
      {errorMessage ? <Text style={styles.err}>{errorMessage}</Text> : null}
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={searchingUsers ? users : conversations}
          keyExtractor={(item: SearchUser | ConversationRow) =>
            "clerkId" in item ? item.clerkId : item.conversationId
          }
          renderItem={({ item }: { item: SearchUser | ConversationRow }) =>
            "clerkId" in item ? (
              <Pressable
                style={styles.row}
                onPress={() => startChat(item.clerkId, item.displayName)}
              >
                <Text style={styles.name}>{item.displayName}</Text>
                <Text style={styles.sub}>{item.email}</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.row} onPress={() => openConversation(item)}>
                <Text style={styles.name}>
                  {item.otherUser?.displayName ?? "Conversation"}
                </Text>
                <Text style={styles.sub}>
                  {item.jobTitle || item.lastMessageText || "Open conversation"}
                </Text>
                {item.lastMessageAt ? (
                  <Text style={styles.time}>
                    {new Date(item.lastMessageAt).toLocaleDateString()}
                  </Text>
                ) : null}
              </Pressable>
            )
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searchingUsers
                ? "No users found"
                : "No conversations yet. Message applicants from your jobs to begin."}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#111827",
  },
  backButtonText: { color: "#fff", fontWeight: "600" },
  search: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  name: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13, color: "#666" },
  time: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },
  err: { color: "crimson", marginBottom: 8 },
  empty: { textAlign: "center", marginTop: 24, color: "#888" },
});
