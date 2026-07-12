"use client"

import { useState } from "react"
import { View, Text, TouchableOpacity, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import PostJobModal from "@/components/PostJobModal"

export default function ServiceScreen() {
  const [modalVisible, setModalVisible] = useState(false)

  return (
    <SafeAreaView className="flex-1 bg-[#0A1F16]">

      {/* ── Entry Screen ── */}
      <View className="flex-1 justify-center px-7 overflow-hidden">

        {/* decorative ring accents */}
        <View
          className="absolute w-[360px] h-[360px] rounded-full border border-[#2AAD7E] opacity-45"
          style={{ top: -110, right: -130 }}
        />
        <View
          className="absolute w-[220px] h-[220px] rounded-full border border-[#2AAD7E] opacity-35"
          style={{ bottom: 50, left: -80 }}
        />

        {/* Q logo mark */}
        <View
          className="w-[52px] h-[52px] rounded-2xl bg-green-700 items-center justify-center mb-7"
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 }}
        >
          <Text className="text-[30px] font-black text-green-900 tracking-[-1px] leading-9 font-jakarta-bold">Q</Text>
        </View>

        {/* Badge */}
        <View className="flex-row items-center self-start bg-[#1E8F65] px-3 py-1.5 rounded-full mb-5 gap-[7px] border border-[#239970]">
          <View className="w-[7px] h-[7px] rounded-full bg-green-400" />
          <Text className="text-xs font-semibold text-green-400 tracking-[0.4px] font-jakarta-semibold">
            Trusted Professionals
          </Text>
        </View>

        <Text className="text-[42px] font-extrabold text-white leading-[50px] tracking-[-1.2px] mb-3.5 font-jakarta-bold">
          Post a task{"\n"}in minutes
        </Text>
        <Text className="text-[15px] text-green-400 leading-[23px] mb-9 max-w-[310px] font-jakarta">
          Tell us what you need and get matched with trusted professionals instantly.
        </Text>

        <TouchableOpacity
          className="flex-row items-center self-start bg-white py-4 pl-[22px] pr-3.5 rounded-full gap-2.5 mb-9"
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 }}
        >
          <Text className="text-green-700 text-[15px] font-bold tracking-wide font-jakarta-bold">
            Create a Job
          </Text>
          <View className="w-[30px] h-[30px] rounded-full bg-green-50 items-center justify-center">
            <Ionicons name="arrow-forward" size={15} color="#1A7F5A" />
          </View>
        </TouchableOpacity>

        {/* stat pills */}
        <View className="flex-row gap-2">
          {[
            { icon: "star",             label: "4.9 Rating" },
            { icon: "people",           label: "12k+ Pros"  },
            { icon: "shield-checkmark", label: "Verified"   },
          ].map((s) => (
            <View
              key={s.label}
              className="flex-row items-center bg-[#1E8F65] px-[11px] py-[7px] rounded-full gap-[5px] border border-[#239970]"
            >
              <Ionicons name={s.icon as any} size={12} color="#6DAF92" />
              <Text className="text-xs text-green-400 font-semibold font-jakarta-semibold">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <PostJobModal visible={modalVisible} onClose={() => setModalVisible(false)} />

    </SafeAreaView>
  )
}
