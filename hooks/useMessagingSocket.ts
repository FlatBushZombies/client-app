import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export type ServerMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  text: string;
  createdAt: string;
  clientMessageId?: string;
};

type Options = {
  serverUrl: string;
  apiBaseUrl: string;
  getToken: () => Promise<string | null>;
  conversationId: string;
  enabled?: boolean;
};

function isUnsupportedSocketHost(serverUrl: string) {
  return /(^|:\/\/)[^/]*vercel\.app(\/|$)/i.test(serverUrl);
}

export function useMessagingSocket({
  serverUrl,
  apiBaseUrl,
  getToken,
  conversationId,
  enabled = true,
}: Options) {
  const socketRef = useRef<Socket | null>(null);
  const getTokenRef = useRef(getToken);
  const [connected, setConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [messages, setMessages] = useState<ServerMessage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const realtimeEnabled = enabled && !isUnsupportedSocketHost(serverUrl);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const appendMessage = useCallback((incoming: ServerMessage) => {
    setMessages((prev) => {
      const exists = prev.some(
        (message) =>
          message.id === incoming.id ||
          (!!incoming.clientMessageId &&
            incoming.clientMessageId === message.clientMessageId)
      );

      if (exists) {
        return prev;
      }

      return [...prev, incoming].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    });
  }, []);

  useEffect(() => {
    if (!enabled || !conversationId) return;

    let cancelled = false;
    let socket: Socket | null = null;
    const baseApiUrl = apiBaseUrl.replace(/\/$/, "").replace(/\/api\/?$/, "");

    (async () => {
      const token = await getTokenRef.current();
      if (!token || cancelled) {
        setLastError("Not signed in");
        setLoadingHistory(false);
        return;
      }

      try {
        const response = await fetch(
          `${baseApiUrl}/api/messaging/conversations/${encodeURIComponent(conversationId)}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load messages");
        }

        if (!cancelled) {
          setMessages(data.messages || []);
        }
      } catch (error) {
        if (!cancelled) {
          setLastError(
            error instanceof Error ? error.message : "Failed to load messages"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
      }

      if (realtimeEnabled) {
        socket = io(serverUrl, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          setConnected(true);
          setLastError(null);
          socket!.emit("join_conversation", { conversationId }, (err: unknown) => {
            if (err) {
              setLastError(JSON.stringify(err));
            }
          });
        });

        socket.on("disconnect", () => {
          setConnected(false);
        });

        socket.on("connect_error", (error: Error) => {
          setLastError(error.message);
        });

        socket.on("message", (message: ServerMessage) => {
          appendMessage(message);
        });
      } else if (!cancelled) {
        setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit("leave_conversation", { conversationId });
        socket.removeAllListeners();
        socket.close();
      }
      socketRef.current = null;
      setConnected(false);
    };
  }, [apiBaseUrl, appendMessage, conversationId, enabled, realtimeEnabled, serverUrl]);

  const sendMessage = useCallback(
    async (text: string, clientMessageId?: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }

      const token = await getTokenRef.current();
      if (!token) {
        setLastError("Not signed in");
        return;
      }

      const baseApiUrl = apiBaseUrl.replace(/\/$/, "").replace(/\/api\/?$/, "");
      const payload = {
        text: trimmedText,
        ...(clientMessageId ? { clientMessageId } : {}),
      };

      const sendViaHttp = async () => {
        const response = await fetch(
          `${baseApiUrl}/api/messaging/conversations/${encodeURIComponent(conversationId)}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to send message");
        }

        appendMessage(data.message);
      };

      const socket = socketRef.current;
      if (!socket?.connected) {
        await sendViaHttp();
        return;
      }

      try {
        await new Promise<void>((resolve, reject) => {
          socket.emit(
            "send_message",
            { conversationId, ...payload },
            (err: unknown) => {
              if (err) {
                reject(
                  new Error(
                    typeof err === "string" ? err : JSON.stringify(err)
                  )
                );
                return;
              }
              resolve();
            }
          );
        });
      } catch (error) {
        try {
          await sendViaHttp();
        } catch (fallbackError) {
          setLastError(
            fallbackError instanceof Error
              ? fallbackError.message
              : error instanceof Error
                ? error.message
                : "Failed to send message"
          );
        }
      }
    },
    [apiBaseUrl, appendMessage, conversationId]
  );

  return {
    connected,
    realtimeEnabled,
    loadingHistory,
    messages,
    sendMessage,
    lastError,
    socket: socketRef,
  };
}
