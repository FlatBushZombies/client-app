import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";

export function showSuccessToast(text1: string, text2?: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  Toast.show({ type: "success", text1, text2, visibilityTime: 3000 });
}

export function showErrorToast(text1: string, text2?: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  Toast.show({ type: "error", text1, text2, visibilityTime: 4000 });
}

export function showInfoToast(text1: string, text2?: string) {
  Haptics.selectionAsync().catch(() => {});
  Toast.show({ type: "info", text1, text2, visibilityTime: 3000 });
}
