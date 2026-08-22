import { router } from "expo-router";

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
