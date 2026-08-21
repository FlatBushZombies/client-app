import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { router } from "expo-router";
import { getApiUrl } from "@/lib/fetch";
import { waitForClerkToken } from "@/lib/session";

let isConfigured = false;
let configurePromise: Promise<void> | null = null;

function getProjectId() {
  return (
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    null
  );
}

export function configurePushNotifications() {
  if (!configurePromise) {
    configurePromise = configurePushNotificationsInternal();
  }
  return configurePromise;
}

async function configurePushNotificationsInternal() {
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
    try {
      // Awaited (not fire-and-forget) so the channel is guaranteed to exist
      // before registerDevicePushToken ever requests a token — on Android
      // 8+, a notification arriving before the "default" channel is created
      // can be dropped or shown without the intended sound/importance.
      // Wrapped in try/catch because some Android OEM notification managers
      // reject this call, and letting that rejection go unhandled here
      // would surface as an uncaught error.
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1A7F5A",
      });
    } catch (error) {
      console.warn("[Push] Failed to configure Android notification channel", error);
    }
  }

  isConfigured = true;
}

export async function registerDevicePushToken(
  getToken: () => Promise<string | null>
) {
  if (Platform.OS === "web") {
    return null;
  }

  // Guarantees the Android notification channel exists before a token is
  // ever requested, regardless of which order the root layout's effects
  // happen to fire in.
  await configurePushNotifications();

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
    // Not treated as success — the token was never sent to the backend, so
    // this must surface as a failure (the caller only marks registration
    // complete when this resolves without throwing) or the app would think
    // push is registered when the backend has no token on file at all.
    throw new Error("Not signed in — push token not registered yet");
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
      appRole: "client",
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
