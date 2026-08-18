"use client"

import { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useUser } from "@clerk/clerk-expo"
import Swiper from "react-native-swiper"
import { Ionicons } from "@expo/vector-icons"
import { SCREEN_PADDING, RADIUS, BUTTON } from "@/constants/layout"
import { COLORS, SHADOW } from "@/constants/theme"

const { width } = Dimensions.get("window")

const onboardingData = [
  {
    id: 1,
    icon: "search",
    title: "Find the Right\nSpecialist",
    description: "Browse through skilled professionals ready to help with your tasks. From cleaning to tech support, we've got you covered.",
    color: COLORS.accentGreen,
    bgColor: COLORS.accentGreenSoft,
  },
  {
    id: 2,
    icon: "document-text",
    title: "Post Your Task\nEasily",
    description: "Describe what you need done, set your budget, and let specialists come to you with their best offers.",
    color: COLORS.accentPurple,
    bgColor: COLORS.accentPurpleSoft,
  },
  {
    id: 3,
    icon: "checkmark-circle",
    title: "Get It Done\nQuickly",
    description: "Review applications, choose the best fit, and watch your task get completed to perfection.",
    color: COLORS.accentAmber,
    bgColor: COLORS.accentAmberSoft,
  },
]

const OnboardingScreen = () => {
  const { user } = useUser()
  const [currentIndex, setCurrentIndex] = useState(0)
  const isLastSlide = currentIndex === onboardingData.length - 1

  const handleComplete = async () => {
    // Mark onboarding as complete in user metadata
    try {
      await user?.update({
        unsafeMetadata: {
          ...user?.unsafeMetadata,
          completedOnboarding: true,
        },
      })
      router.replace("/(root)/home")
    } catch (error) {
      console.error("Error completing onboarding:", error)
      // Even if update fails, proceed to home
      router.replace("/(root)/home")
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <View className="flex-1">
        {/* Skip Button */}
        {!isLastSlide && (
          <View className="absolute top-4 right-6 z-10">
            <TouchableOpacity
              onPress={handleSkip}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: RADIUS.pill,
                backgroundColor: COLORS.surfaceMuted,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: COLORS.textSecondary,
                  fontFamily: "PlusJakartaSans_600SemiBold",
                }}
              >
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Swiper */}
        <Swiper
          loop={false}
          dot={
            <View
              style={{
                backgroundColor: COLORS.borderDashed,
                width: 8,
                height: 8,
                borderRadius: 4,
                marginLeft: 4,
                marginRight: 4,
              }}
            />
          }
          activeDot={
            <View
              style={{
                backgroundColor: COLORS.primary,
                width: 24,
                height: 8,
                borderRadius: 4,
                marginLeft: 4,
                marginRight: 4,
              }}
            />
          }
          paginationStyle={{
            bottom: Platform.OS === "ios" ? 180 : 160,
          }}
          onIndexChanged={(index) => setCurrentIndex(index)}
        >
          {onboardingData.map((item) => (
            <View
              key={item.id}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: SCREEN_PADDING.hero,
                paddingBottom: Platform.OS === "ios" ? 200 : 180,
              }}
            >
              {/* Icon Circle */}
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: item.bgColor,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 48,
                  shadowColor: item.color,
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.15,
                  shadowRadius: 24,
                  elevation: 8,
                }}
              >
                <Ionicons name={item.icon as any} size={72} color={item.color} />
              </View>

              {/* Text panel */}
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: RADIUS.xxl,
                  paddingVertical: 24,
                  paddingHorizontal: 20,
                  ...SHADOW.card,
                }}
              >
                {/* Title */}
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: COLORS.textPrimary,
                    textAlign: "center",
                    marginBottom: 16,
                    lineHeight: 40,
                    letterSpacing: -0.5,
                    fontFamily: "PlusJakartaSans_700Bold",
                  }}
                >
                  {item.title}
                </Text>

                {/* Description */}
                <Text
                  style={{
                    fontSize: 16,
                    color: COLORS.textSecondary,
                    textAlign: "center",
                    lineHeight: 26,
                    paddingHorizontal: 8,
                    fontFamily: "PlusJakartaSans_400Regular",
                  }}
                >
                  {item.description}
                </Text>
              </View>
            </View>
          ))}
        </Swiper>

        {/* Bottom Button */}
        <View
          style={{
            position: "absolute",
            bottom: Platform.OS === "ios" ? 50 : 30,
            left: 0,
            right: 0,
            paddingHorizontal: SCREEN_PADDING.hero,
          }}
        >
          <TouchableOpacity
            onPress={handleComplete}
            activeOpacity={0.85}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: BUTTON.radius,
              paddingVertical: BUTTON.paddingVertical,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.32,
              shadowRadius: 20,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "700",
                marginRight: 8,
                fontFamily: "PlusJakartaSans_700Bold",
              }}
            >
              {isLastSlide ? "Get Started" : "Continue"}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Trust indicator */}
          {isLastSlide && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 20,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: COLORS.primary,
                  opacity: 0.4,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: COLORS.textMuted,
                  fontFamily: "PlusJakartaSans_400Regular",
                }}
              >
                Join thousands of satisfied clients
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

export default OnboardingScreen
