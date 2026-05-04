import * as Linking from "expo-linking";
import * as SecureStore from "expo-secure-store";

import { ensureBackendUser } from "@/lib/userSync";

export const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log("No values stored under key: " + key);
      }
      return item;
    } catch (error) {
      console.error("SecureStore get item error: ", error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
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
