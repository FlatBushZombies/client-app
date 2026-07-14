import React, { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ToastConfigParams } from "react-native-toast-message";
import { COLORS, SHADOW } from "@/constants/theme";

function ToastCard({
  text1,
  text2,
  accent,
  accentSoft,
  iconName,
}: {
  text1?: string;
  text2?: string;
  accent: string;
  accentSoft: string;
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
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderLeftWidth: 4,
        borderLeftColor: accent,
        paddingVertical: 14,
        paddingHorizontal: 14,
        ...SHADOW.raised,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={iconName} size={18} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        {text1 ? (
          <Text
            style={{
              fontFamily: "PlusJakartaSans_700Bold",
              fontSize: 14,
              color: COLORS.textPrimary,
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
              color: COLORS.textSecondary,
              marginTop: 2,
            }}
            numberOfLines={3}
          >
            {text2}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const toastConfig = {
  success: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard
      text1={text1}
      text2={text2}
      accent={COLORS.primary}
      accentSoft={COLORS.primarySoft}
      iconName="checkmark-circle"
    />
  ),
  error: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard
      text1={text1}
      text2={text2}
      accent={COLORS.badgeRed}
      accentSoft="#FEE2E2"
      iconName="close-circle"
    />
  ),
  info: ({ text1, text2 }: ToastConfigParams<unknown>) => (
    <ToastCard
      text1={text1}
      text2={text2}
      accent={COLORS.info}
      accentSoft={COLORS.infoSoft}
      iconName="information-circle"
    />
  ),
};
