import { SplashScreen, Stack } from "expo-router";
import './globals.css';
import { ClerkProvider } from "@clerk/clerk-expo";
import { LogBox } from "react-native";
import { tokenCache } from "@/lib/auth";
import { SocketProvider } from "@/contexts/SocketContext";

SplashScreen.hideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env",
  );
}

LogBox.ignoreLogs(["Clerk:"]);

export default function RootLayout() {
  return (
  <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
    <SocketProvider>
      <Stack screenOptions={{headerShown: false}} />
    </SocketProvider>
  </ClerkProvider>
 );
}
