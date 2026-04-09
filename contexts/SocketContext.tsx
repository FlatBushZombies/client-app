import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { io, Socket } from "socket.io-client";
import { API_BASE_URL, getApiUrl } from "@/lib/fetch";

type NotificationApplication = {
  id: number;
  freelancerName?: string | null;
  freelancerEmail?: string | null;
  createdAt?: string | null;
  status?: string | null;
  contactExchange?: {
    status?: string | null;
    readyForDirectContact?: boolean;
    needsClientPhoneNumber?: boolean;
  } | null;
};

export interface Notification {
  id: number;
  userId: number | string;
  jobId: number;
  message: string;
  read: boolean;
  createdAt: string;
  application?: NotificationApplication;
}

interface SocketContextType {
  notifications: Notification[];
  unreadCount: number;
  connected: boolean;
  activeNotification: Notification | null;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotifications: () => void;
  dismissActiveNotification: () => void;
  refreshNotifications: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = API_BASE_URL.replace(/\/$/, "").replace(/\/api\/?$/, "");
const POLL_INTERVAL_MS = 15000;

function isUnsupportedSocketHost(serverUrl: string) {
  return /(^|:\/\/)[^/]*vercel\.app(\/|$)/i.test(serverUrl);
}

function sortNotifications(items: Notification[]) {
  return [...items].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function mergeNotifications(current: Notification[], incoming: Notification[]) {
  const byId = new Map<number, Notification>();

  for (const item of current) {
    byId.set(item.id, item);
  }

  for (const item of incoming) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? { ...existing, ...item } : item);
  }

  return sortNotifications(Array.from(byId.values()));
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const getTokenRef = useRef(getToken);
  const userIdRef = useRef<string | null>(user?.id ?? null);
  const hasLoadedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  const dismissActiveNotification = useCallback(() => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }

    setActiveNotification(null);
  }, []);

  const showInAppNotification = useCallback((notification: Notification) => {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
    }

    setActiveNotification(notification);
    bannerTimeoutRef.current = setTimeout(() => {
      setActiveNotification((current) => (current?.id === notification.id ? null : current));
      bannerTimeoutRef.current = null;
    }, 3500);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    try {
      const token = await getTokenRef.current();
      const response = await fetch(getApiUrl(`/api/notifications/by-clerk/${user.id}`), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.notifications)) {
        throw new Error(data?.message || data?.error || "Failed to fetch notifications");
      }

      setNotifications((current) => {
        const knownIds = new Set(current.map((notification) => notification.id));
        const nextNotifications = mergeNotifications(current, data.notifications);
        const newestFreshNotification = data.notifications.find(
          (notification: Notification) => !knownIds.has(notification.id)
        );

        if (hasLoadedRef.current && appStateRef.current === "active" && newestFreshNotification) {
          showInAppNotification(newestFreshNotification);
        }

        return nextNotifications;
      });
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("[Notifications] Error fetching notifications", error);
    }
  }, [showInAppNotification, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    void refreshNotifications();

    const interval = setInterval(() => {
      void refreshNotifications();
    }, POLL_INTERVAL_MS);

    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      if (nextState === "active") {
        void refreshNotifications();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshNotifications, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      socketRef.current?.removeAllListeners();
      socketRef.current?.close();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    if (isUnsupportedSocketHost(SOCKET_URL)) {
      setConnected(false);
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      const token = await getTokenRef.current();
      if (!token || cancelled) {
        return;
      }

      socket = io(SOCKET_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        if (!cancelled) {
          setConnected(true);
        }
      });

      socket.on("disconnect", () => {
        if (!cancelled) {
          setConnected(false);
        }
      });

      socket.on("connect_error", (error: Error) => {
        console.warn("[Notifications] Socket connection error", error.message);
      });

      socket.on("notification:new", (payload: { notification?: Notification }) => {
        if (!payload?.notification) {
          return;
        }

        setNotifications((current) => mergeNotifications(current, [payload.notification!]));

        if (hasLoadedRef.current && appStateRef.current === "active") {
          showInAppNotification(payload.notification);
        }
      });
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.removeAllListeners();
        socket.close();
      }
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setConnected(false);
    };
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  const markAsRead = useCallback(async (notificationId: number) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );

    try {
      const token = await getTokenRef.current();
      const response = await fetch(getApiUrl(`/api/notifications/${notificationId}/read`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification ${notificationId} as read`);
      }
    } catch (error) {
      console.error("[Notifications] Error marking notification as read", error);
      void refreshNotifications();
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    const clerkId = userIdRef.current;
    if (!clerkId) {
      return;
    }

    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));

    try {
      const token = await getTokenRef.current();
      const response = await fetch(getApiUrl(`/api/notifications/by-clerk/${clerkId}/read`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
    } catch (error) {
      console.error("[Notifications] Error marking all notifications as read", error);
      void refreshNotifications();
    }
  }, [refreshNotifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((notification) => !notification.read).length,
      connected,
      activeNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      dismissActiveNotification,
      refreshNotifications,
    }),
    [
      activeNotification,
      clearNotifications,
      connected,
      dismissActiveNotification,
      markAllAsRead,
      markAsRead,
      notifications,
      refreshNotifications,
    ]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }

  return context;
}
