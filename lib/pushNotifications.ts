import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import { getApiUrl } from "@/lib/fetch";
import { waitForClerkToken } from "@/lib/session";

let isConfigured = false;

function getProjectId() {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    null
  );
}

export function configurePushNotifications() {
  if (Platform.OS === "web") {
    return;
  }

  if (isConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  if (Platform.OS === "android") {
    void Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1A7F5A",
    });
  }

  isConfigured = true;
}

export async function registerDevicePushToken(
  getToken: () => Promise<string | null>
) {
  if (Platform.OS === "web") {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("[Push] Missing EAS project ID, skipping push registration");
    return null;
  }

  const existingPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = existingPermissions.status;

  if (permissionStatus !== "granted") {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermissions.status;
  }

  if (permissionStatus !== "granted") {
    return null;
  }

  let expoPushToken: string;

  try {
    expoPushToken = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
  } catch (error) {
    console.warn("[Push] Failed to obtain Expo push token", error);
    return null;
  }

  const authToken = await waitForClerkToken(getToken);
  if (!authToken) {
    return expoPushToken;
  }

  const response = await fetch(getApiUrl("/api/user/me/push-token"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      token: expoPushToken,
      platform: Platform.OS,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => null);
    throw new Error(
      responseBody?.message || "Failed to register device for push notifications"
    );
  }

  return expoPushToken;
}

export type NotificationTapData = {
  type?: string | null;
  jobId?: string | number | null;
  conversationId?: string | null;
  [key: string]: unknown;
};

/**
 * Routes a tapped push notification (or a tapped row in the in-app
 * notification list, which carries the same shape) to the right screen.
 * Conversation-carrying notifications always win — they're the most
 * specific target we have.
 */
export function navigateForNotificationData(data: NotificationTapData | null | undefined) {
  if (!data) return;

  if (data.conversationId) {
    router.push({
      pathname: "/(root)/chat",
      params: { conversationId: String(data.conversationId) },
    });
    return;
  }

  if (data.jobId) {
    router.push("/(root)/applications");
  }
}

let coldStartResponseHandled = false;

/**
 * Wires up push-notification tap handling: taps while the app is
 * foregrounded/backgrounded (addNotificationResponseReceivedListener) and
 * a cold start launched by tapping a notification
 * (getLastNotificationResponseAsync, checked once). Call once from the
 * root layout; returns a cleanup function.
 */
export function registerNotificationTapHandler() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    navigateForNotificationData(
      response.notification.request.content.data as NotificationTapData
    );
  });

  if (!coldStartResponseHandled) {
    coldStartResponseHandled = true;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        navigateForNotificationData(
          response.notification.request.content.data as NotificationTapData
        );
      }
    });
  }

  return () => subscription.remove();
}
