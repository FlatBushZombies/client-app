import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-expo";

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
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const token = await getToken();
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
    if (!user?.id) return;

    // Initial fetch
    fetchNotifications();

    // Poll every 10 seconds for new notifications
    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, [getToken, user?.id]);

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
