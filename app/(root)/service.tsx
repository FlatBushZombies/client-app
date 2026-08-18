"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import PostJobModal from "@/components/PostJobModal"
import { COLORS, SHADOW } from "@/constants/theme"
import { SCREEN_PADDING } from "@/constants/layout"

export default function ServiceScreen() {
  const [modalVisible, setModalVisible] = useState(false)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>

      {/* ── Entry Screen ── */}
      <View
        className="flex-1 justify-center overflow-hidden"
        style={{ paddingHorizontal: SCREEN_PADDING.hero }}
      >

        {/* decorative ring accents */}
        <View
          className="absolute w-[360px] h-[360px] rounded-full"
          style={{ top: -110, right: -130, borderWidth: 1, borderColor: COLORS.primary, opacity: 0.12 }}
        />
        <View
          className="absolute w-[220px] h-[220px] rounded-full"
          style={{ bottom: 50, left: -80, borderWidth: 1, borderColor: COLORS.primary, opacity: 0.08 }}
        />

        {/* Q logo mark */}
        <View
          className="w-[52px] h-[52px] rounded-2xl items-center justify-center mb-7"
          style={{ backgroundColor: COLORS.primary, ...SHADOW.raised }}
        >
          <Text className="text-[30px] font-black tracking-[-1px] leading-9 font-jakarta-bold" style={{ color: COLORS.surface }}>Q</Text>
        </View>

        {/* Badge */}
        <View
          className="flex-row items-center self-start px-3 py-1.5 rounded-full mb-5 gap-[7px]"
          style={{ backgroundColor: COLORS.primarySoft, borderWidth: 1, borderColor: COLORS.primary }}
        >
          <View className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: COLORS.primary }} />
          <Text className="text-xs font-semibold tracking-[0.4px] font-jakarta-semibold" style={{ color: COLORS.primaryDark }}>
            Trusted Professionals
          </Text>
        </View>

        <Text className="text-[42px] font-extrabold leading-[50px] tracking-[-1.2px] mb-3.5 font-jakarta-bold" style={{ color: COLORS.textPrimary }}>
          Post a task{"\n"}in minutes
        </Text>
        <Text className="text-[15px] leading-[23px] mb-9 max-w-[310px] font-jakarta" style={{ color: COLORS.textSecondary }}>
          Tell us what you need and get matched with trusted professionals instantly.
        </Text>

        <TouchableOpacity
          className="flex-row items-center self-start py-4 pl-[22px] pr-3.5 rounded-full gap-2.5 mb-9"
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          style={{ backgroundColor: COLORS.primary, ...SHADOW.raised }}
        >
          <Text className="text-[15px] font-bold tracking-wide font-jakarta-bold" style={{ color: COLORS.surface }}>
            Create a Job
          </Text>
          <View className="w-[30px] h-[30px] rounded-full items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.22)" }}>
            <Ionicons name="arrow-forward" size={15} color={COLORS.surface} />
          </View>
        </TouchableOpacity>

        {/* stat pills */}
        <View className="flex-row gap-2">
          {[
            { icon: "star",             label: "4.9 Rating", bg: COLORS.accentAmberSoft,  fg: COLORS.accentAmber  },
            { icon: "people",           label: "12k+ Pros",  bg: COLORS.accentPurpleSoft, fg: COLORS.accentPurple },
            { icon: "shield-checkmark", label: "Verified",   bg: COLORS.accentGreenSoft,  fg: COLORS.accentGreen  },
          ].map((s) => (
            <View
              key={s.label}
              className="flex-row items-center px-[11px] py-[7px] rounded-full gap-[5px]"
              style={{ backgroundColor: s.bg }}
            >
              <Ionicons name={s.icon as any} size={12} color={s.fg} />
              <Text className="text-xs font-semibold font-jakarta-semibold" style={{ color: s.fg }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <PostJobModal visible={modalVisible} onClose={() => setModalVisible(false)} />

    </SafeAreaView>
  )
}
