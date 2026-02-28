import { SplashScreen, Stack } from "expo-router";
import './globals.css';
import { ClerkProvider } from "@clerk/clerk-expo";
import { LogBox } from "react-native";
import { tokenCache } from "@/lib/auth";
import { SocketProvider } from "@/contexts/SocketContext";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useEffect, useState } from "react";
import CustomSplashScreen from "@/components/SplashScreen";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

LogBox.ignoreLogs(["Clerk:"]);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
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
        <Stack screenOptions={{ headerShown: false }} />

        {/* Custom animated splash sits on top (z-[9999]) and fades itself out */}
        {!splashAnimDone && (
          <CustomSplashScreen onFinish={() => setSplashAnimDone(true)} />
        )}

      </SocketProvider>
    </ClerkProvider>
  );
}