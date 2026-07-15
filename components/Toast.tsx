import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import type { ToastConfigParams } from "react-native-toast-message";
import { SHADOW } from "@/constants/theme";

function ToastCard({
  text1,
  text2,
  accent,
  iconName,
}: {
  text1?: string;
  text2?: string;
  accent: string;
  iconName: keyof typeof Ionicons.glyphMap;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const translateY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 220 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 220 }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }, { translateY }],
        width: "92%",
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.09)",
        ...SHADOW.raised,
      }}
    >
      <BlurView
        intensity={90}
        tint="dark"
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          backgroundColor: "rgba(18,18,22,0.55)",
          paddingVertical: 14,
          paddingHorizontal: 16,
        }}
      >
        <Ionicons name={iconName} size={20} color={accent} />
        <View style={{ flex: 1 }}>
          {text1 ? (
            <Text
              style={{
                fontFamily: "PlusJakartaSans_700Bold",
                fontSize: 14,
                color: "#FFFFFF",
              }}
              numberOfLines={2}
            >
              {text1}
            </Text>
          ) : null}
          {text2 ? (
            <Text
              style={{
                fontFamily: "PlusJakartaSans_500Medium",
                fontSize: 12,
                lineHeight: 17,
                color: "rgba(255,255,255,0.72)",
                marginTop: 2,
              }}
              numberOfLines={3}
            >
              {text2}
            </Text>
          ) : null}
        </View>
      </BlurView>
    </Animated.View>
  );
}

export const toastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard text1={text1} text2={text2} accent="#6EE7B7" iconName="checkmark-circle" />
  ),
  error: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard text1={text1} text2={text2} accent="#FCA5A5" iconName="close-circle" />
  ),
  info: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard text1={text1} text2={text2} accent="#93C5FD" iconName="information-circle" />
  ),
};
