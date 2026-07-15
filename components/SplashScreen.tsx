"use client"

import { useEffect, useRef } from "react"
import { Animated, Easing, Image } from "react-native"

import { IMAGES } from "@/constants"

interface SplashScreenProps {
  onFinish?: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current
  const logoScale = useRef(new Animated.Value(0.9)).current
  const screenOpacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    Animated.sequence([
      // Entrance — fade + settle
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Hold
      Animated.delay(600),
      // Exit — fade the whole screen out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => onFinish?.())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Animated.View
      style={{ opacity: screenOpacity, backgroundColor: "#FFFFFF" }}
      className="absolute inset-0 z-[9999] items-center justify-center"
    >
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
          alignItems: "center",
        }}
      >
        <Image
          source={IMAGES.logo}
          style={{ width: 116, height: 116 }}
          resizeMode="contain"
        />
        <Animated.Text
          style={{
            marginTop: 18,
            fontSize: 11,
            color: "#9CA3AF",
            letterSpacing: 2.5,
            textTransform: "uppercase",
            fontFamily: "DMSans_500Medium",
          }}
        >
          Quickhands Now
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  )
}
