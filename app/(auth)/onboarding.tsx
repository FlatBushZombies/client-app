"use client"

import { useState } from "react"
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native"
import { router } from "expo-router"
import { useUser } from "@clerk/clerk-expo"
import Swiper from "react-native-swiper"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

const onboardingData = [
  {
    id: 1,
    icon: "search",
    title: "Find the Right\nSpecialist",
    description: "Browse through skilled professionals ready to help with your tasks. From cleaning to tech support, we've got you covered.",
    color: "#15803D",
    bgColor: "#DCFCE7",
  },
  {
    id: 2,
    icon: "document-text",
    title: "Post Your Task\nEasily",
    description: "Describe what you need done, set your budget, and let specialists come to you with their best offers.",
    color: "#1A7A4A",
    bgColor: "#D1FAE5",
  },
  {
    id: 3,
    icon: "checkmark-circle",
    title: "Get It Done\nQuickly",
    description: "Review applications, choose the best fit, and watch your task get completed to perfection.",
    color: "#166534",
    bgColor: "#BBF7D0",
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
    <SafeAreaView className="flex-1 bg-white">
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
                borderRadius: 20,
                backgroundColor: "#F3F4F6",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#6B7280",
                  fontFamily: "Jakarta-SemiBold",
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
                backgroundColor: "#D1D5DB",
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
                backgroundColor: "#15803D",
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
                paddingHorizontal: 32,
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

              {/* Title */}
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "800",
                  color: "#111827",
                  textAlign: "center",
                  marginBottom: 20,
                  lineHeight: 40,
                  letterSpacing: -0.5,
                  fontFamily: "Jakarta-Bold",
                }}
              >
                {item.title}
              </Text>

              {/* Description */}
              <Text
                style={{
                  fontSize: 16,
                  color: "#6B7280",
                  textAlign: "center",
                  lineHeight: 26,
                  paddingHorizontal: 8,
                  fontFamily: "Jakarta",
                }}
              >
                {item.description}
              </Text>
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
            paddingHorizontal: 32,
          }}
        >
          <TouchableOpacity
            onPress={handleComplete}
            activeOpacity={0.85}
            style={{
              backgroundColor: "#15803D",
              borderRadius: 18,
              paddingVertical: 18,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#15803D",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "700",
                marginRight: 8,
                fontFamily: "Jakarta-Bold",
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
                  backgroundColor: "#15803D",
                  opacity: 0.4,
                  marginRight: 8,
                }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontFamily: "Jakarta",
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
