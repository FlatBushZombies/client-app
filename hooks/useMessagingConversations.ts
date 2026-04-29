import { useCallback, useEffect, useRef, useState } from "react";

export type ConversationSummary = {
  conversationId: string;
  conversationType: string;
  jobId: number | null;
  jobTitle: string | null;
  otherUser: {
    clerkId: string;
    displayName: string;
  } | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Options = {
  apiUrl: string;
  getToken: () => Promise<string | null>;
  enabled?: boolean;
};

export function useMessagingConversations({
  apiUrl,
  getToken,
  enabled = true,
}: Options) {
  const getTokenRef = useRef(getToken);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      setConversations([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current();
      if (!token) {
        setError("Not signed in");
        setConversations([]);
        return;
      }

      const base = apiUrl.replace(/\/$/, "").replace(/\/api\/?$/, "");
      const response = await fetch(`${base}/api/messaging/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load conversations");
      }

      setConversations(data.conversations || []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load conversations");
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const timer = setInterval(() => {
      refresh().catch(() => undefined);
    }, 10000);

    return () => clearInterval(timer);
  }, [enabled, refresh]);

  return { conversations, loading, error, refresh };
}
