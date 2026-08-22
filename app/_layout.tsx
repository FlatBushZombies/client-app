import { router, SplashScreen, Stack } from "expo-router";
import './globals.css';
import { ClerkProvider } from "@clerk/clerk-expo";
import { LogBox, Pressable, Text, View } from "react-native";
import { tokenCache } from "@/lib/auth";
import { SocketProvider, useSocket } from "@/contexts/SocketContext";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from "@expo-google-fonts/dm-serif-display";
import { useEffect, useState } from "react";
import CustomSplashScreen from "@/components/SplashScreen";
import Toast from "react-native-toast-message";
import { toastConfig } from "@/components/Toast";
import { COLORS, SHADOW } from "@/constants/theme";
import { RADIUS } from "@/constants/layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

LogBox.ignoreLogs(["Clerk:"]);

function getNotificationBannerCopy(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("in your area")) {
    return {
      title: "In your area",
      body: message,
      accent: COLORS.primaryDark,
      background: "#ECFDF5",
    };
  }

  if (normalized.includes("accepted") && (normalized.includes("phone number") || normalized.includes("contact"))) {
    return {
      title: "Offer accepted",
      body: "Accepted and ready for direct contact.",
      accent: COLORS.primary,
      background: "#ECFDF5",
    };
  }

  if (normalized.includes("accepted")) {
    return {
      title: "Offer accepted",
      body: "Your latest offer update is ready.",
      accent: COLORS.primary,
      background: "#ECFDF5",
    };
  }

  if (normalized.includes("rejected")) {
    return {
      title: "Offer rejected",
      body: "A client declined an offer update.",
      accent: "#EF4444",
      background: "#FEF2F2",
    };
  }

  if (normalized.includes("phone number") || normalized.includes("contact")) {
    return {
      title: "Contact shared",
      body: "Direct contact details are now available.",
      accent: "#0EA5E9",
      background: "#F0F9FF",
    };
  }

  return {
    title: "New notification",
    body: message,
    accent: "#2563EB",
    background: "#EFF6FF",
  };
}

function InAppNotificationBanner() {
  const { activeNotification, dismissActiveNotification } = useSocket();

  if (!activeNotification) {
    return null;
  }

  const copy = getNotificationBannerCopy(activeNotification.message);

  return (
    <Pressable
      onPress={() => {
        dismissActiveNotification();
        router.push("/(root)/notifications");
      }}
      style={{
        position: "absolute",
        top: 54,
        left: 16,
        right: 16,
        zIndex: 1000,
        borderRadius: RADIUS.xl,
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOW.raised,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: copy.accent,
            marginTop: 4,
            marginRight: 12,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.textPrimary,
              fontSize: 14,
              fontFamily: "PlusJakartaSans_700Bold",
              marginBottom: 2,
            }}
          >
            {copy.title}
          </Text>
          <Text
            style={{
              color: COLORS.textSecondary,
              fontSize: 13,
              lineHeight: 18,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            {copy.body}
          </Text>
        </View>
        <View
          style={{
            marginLeft: 12,
            alignSelf: "center",
            borderRadius: 999,
            backgroundColor: copy.background,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{
              color: copy.accent,
              fontSize: 11,
              fontFamily: "PlusJakartaSans_600SemiBold",
            }}
          >
            View
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  });

  // Controls whether the custom animated splash is visible.
  // It stays true until BOTH fonts are ready AND the animation has finished.
  const [splashAnimDone, setSplashAnimDone] = useState(false);

  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontsReady) {
      // Hide the native splash screen (the static one from app.json / expo-splash-screen)
      // as soon as fonts are loaded. Our custom animated splash takes over from here.
      SplashScreen.hideAsync();
    }
  }, [fontsReady]);

  // Don't render anything until fonts are ready — prevents a flash of unstyled text.
  if (!fontsReady) return null;

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <SocketProvider>
        {/* App content renders behind the splash; revealed once it fades out */}
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false }} />
        </ErrorBoundary>
        {splashAnimDone ? <InAppNotificationBanner /> : null}
        <Toast config={toastConfig} />

        {/* Custom animated splash sits on top (z-[9999]) and fades itself out */}
        {!splashAnimDone && (
          <CustomSplashScreen onFinish={() => setSplashAnimDone(true)} />
        )}

      </SocketProvider>
    </ClerkProvider>
  );
}
