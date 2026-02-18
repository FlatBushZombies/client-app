import React, { createContext, useContext, useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-expo";

interface Notification {
  id: number;
  userId: string;
  jobId: number;
  message: string;
  read: boolean;
  createdAt: string;
  application?: {
    id: number;
    freelancerName: string;
    freelancerEmail: string;
    createdAt: string;
  };
}

interface SocketContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: number) => void;
  clearNotifications: () => void;
  refreshNotifications: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    // Check if getIdToken method exists
    if (typeof user.getIdToken !== 'function') {
      console.warn('[Notifications] user.getIdToken is not a function yet');
      return;
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(
        'https://quickhands-api.vercel.app/api/notifications/by-clerk/' + user.id,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        }
      }
    } catch (error) {
      console.error('[Notifications] Error fetching:', error);
    }
  };

  useEffect(() => {
    // Wait for user to be fully loaded with getIdToken method
    if (!user?.id || typeof user.getIdToken !== 'function') return;

    // Initial fetch
    fetchNotifications();

    // Poll every 10 seconds for new notifications
    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, [user?.id, user?.getIdToken]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SocketContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearNotifications,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
