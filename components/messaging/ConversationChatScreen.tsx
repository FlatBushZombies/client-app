import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useMessagingSocket } from "@/hooks/useMessagingSocket";

const DEFAULT_API_URL = "https://quickhands-api.vercel.app";
const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
const API_BASE_URL = API_URL.replace(/\/api\/?$/, "");
const SOCKET_URL = (process.env.EXPO_PUBLIC_SOCKET_URL ?? API_BASE_URL)
  .replace(/\/$/, "")
  .replace(/\/api\/?$/, "");

type Props = {
  clerkUserId: string;
  conversationId: string;
  otherDisplayName?: string;
  jobTitle?: string;
};

export function ConversationChatScreen({
  clerkUserId,
  conversationId,
  otherDisplayName,
  jobTitle,
}: Props) {
  const { getToken } = useAuth();
  const [draft, setDraft] = useState("");

  const { connected, realtimeEnabled, loadingHistory, messages, sendMessage, lastError } =
    useMessagingSocket({
      serverUrl: SOCKET_URL,
      apiBaseUrl: API_BASE_URL,
      getToken,
      conversationId,
      enabled: !!API_BASE_URL,
    });

  const title = otherDisplayName ?? jobTitle ?? "Chat";

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{title}</Text>
      {jobTitle ? <Text style={styles.subheader}>{jobTitle}</Text> : null}
      <Text style={styles.status}>
        {realtimeEnabled ? (connected ? "Live" : "Connecting") : "REST mode"}
        {lastError ? ` • ${lastError}` : ""}
      </Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.meta}>
              {item.senderId === clerkUserId ? "You" : otherDisplayName ?? item.senderId} •{" "}
              {new Date(item.createdAt).toLocaleTimeString()}
            </Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          loadingHistory ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <Text style={styles.empty}>No messages yet. Say hello.</Text>
          )
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Message"
          placeholderTextColor="#888"
        />
        <Pressable
          style={styles.send}
          onPress={async () => {
            const text = draft.trim();
            if (!text) return;
            await sendMessage(text);
            setDraft("");
          }}
        >
          <Text style={styles.sendLabel}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, paddingTop: 48 },
  header: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  subheader: { fontSize: 13, color: "#4B5563", marginBottom: 4 },
  status: { fontSize: 12, marginBottom: 8, color: "#666" },
  row: { marginBottom: 12 },
  meta: { fontSize: 11, color: "#888" },
  text: { fontSize: 16, color: "#111" },
  empty: { textAlign: "center", marginTop: 24, color: "#888" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  send: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sendLabel: { color: "#fff", fontWeight: "600" },
});
