import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ensureBackendUser } from "@/lib/userSync";

// SecureStore rejects (or silently mishandles) values above roughly 2048
// bytes on some platforms. Clerk's cached client-state JWT can exceed that,
// especially after Google OAuth — when that happened, saveToken's old
// catch-and-swallow meant the session silently never persisted, so the app
// looked signed-out on every restart despite the user having just signed
// in. SecureStore is still tried first (and preferred) for every token;
// this fallback only kicks in for the rare oversized value.
const FALLBACK_PREFIX = "clerk_fallback_";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
        return item;
      }
    } catch (error) {
      console.error("SecureStore get item error: ", error);
    }

    try {
      const fallback = await AsyncStorage.getItem(FALLBACK_PREFIX + key);
      if (fallback) console.log(`${key} was used (fallback storage) \n`);
      return fallback;
    } catch (fallbackError) {
      console.error("AsyncStorage fallback get item error: ", fallbackError);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      await AsyncStorage.removeItem(FALLBACK_PREFIX + key).catch(() => {});
      return;
    } catch (error) {
      console.warn(
        `SecureStore save failed for ${key} (likely exceeds the platform's value size limit) — falling back to AsyncStorage so the session still persists.`,
        error
      );
    }

    try {
      await AsyncStorage.setItem(FALLBACK_PREFIX + key, value);
    } catch (fallbackError) {
      console.error("AsyncStorage fallback save error: ", fallbackError);
    }
  },
};

export const googleOAuth = async (startOAuthFlow: any) => {
  try {
    const { createdSessionId, setActive, signUp, user } = await startOAuthFlow({
      redirectUrl: Linking.createURL("/(root)/home"),
    });

    if (createdSessionId) {
      if (setActive) {
        await setActive({ session: createdSessionId });

        let needsOnboarding = false;

        try {
          const backendUser = await ensureBackendUser(
            user || {
              id: signUp?.createdUserId || null,
              firstName: signUp?.firstName || null,
              lastName: signUp?.lastName || null,
              fullName:
                `${signUp?.firstName || ""} ${signUp?.lastName || ""}`.trim() || null,
              primaryEmailAddress: signUp?.emailAddress
                ? { emailAddress: signUp.emailAddress }
                : null,
            }
          );
          needsOnboarding = backendUser?.completedOnboarding !== true;
        } catch (syncError) {
          console.error("User sync error after OAuth session activation:", syncError);
        }

        return {
          success: true,
          code: "success",
          needsOnboarding,
          message: "You have successfully signed in with Google",
        };
      }
    }

    return {
      success: false,
      message: "An error occurred while signing in with Google",
    };
  } catch (err: any) {
    console.error(err);
    return {
      success: false,
      code: err.code,
      message: err?.errors[0]?.longMessage,
    };
  }
};
