import { useState } from "react"
import { useOAuth } from "@clerk/clerk-expo"
import { router } from "expo-router"
import { Image, Text, View } from "react-native"

import CustomButton from "@/components/CustomButton"
import { icons } from "@/constants"
import { googleOAuth } from "@/lib/auth"
import { showErrorToast } from "@/lib/toast"
import { COLORS } from "@/constants/theme"

const OAuth = () => {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" })
  const [loading, setLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    if (loading) return

    try {
      setLoading(true)

      const result = await googleOAuth(startOAuthFlow)

      if (result.success) {
        router.replace(result.needsOnboarding ? "/(auth)/onboarding" : "/")
        return
      }

      showErrorToast("Authentication failed", result.message)
    } catch {
      showErrorToast(
        "Something went wrong",
        "Please try again or check your connection."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className="w-full">
      {/* Section Spacer */}
      <View className="h-4" />

      {/* Divider */}
      <View className="flex-row items-center gap-x-4">
        <View className="flex-1 h-[1px]" style={{ backgroundColor: COLORS.border }} />
        <Text className="text-xs uppercase tracking-wider" style={{ color: COLORS.textMuted }}>
          Continue with
        </Text>
        <View className="flex-1 h-[1px]" style={{ backgroundColor: COLORS.border }} />
      </View>

      {/* Vertical Breathing Space */}
      <View className="h-8" />

      {/* Google Button */}
      <CustomButton
        title={loading ? "Signing you in…" : "Continue with Google"}
        disabled={loading}
        IconLeft={() => (
          <Image
            source={icons.google}
            resizeMode="contain"
            className="w-5 h-5 mr-3"
          />
        )}
        bgVariant="outline"
        textVariant="primary"
        onPress={handleGoogleSignIn}
      />

      {/* Trust Copy Spacer */}
      <View className="h-6" />

      {/* Trust Note */}
      <Text className="text-xs text-center leading-relaxed px-6" style={{ color: COLORS.textMuted }}>
        We only use your account to create your profile.
        {"\n"}
        No posts. No spam.
      </Text>

      {/* Bottom Spacer */}
      <View className="h-2" />
    </View>
  )
}

export default OAuth
