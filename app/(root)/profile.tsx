"use client"

import React from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useUser, useAuth } from "@clerk/clerk-expo"
import {
  Briefcase,
  Star,
  Wallet,
  Settings,
  LogOut,
  PlusCircle,
} from "lucide-react-native"

/* -----------------------------
   Profile Screen
------------------------------ */
const Profile = () => {
  const { user } = useUser()
  const { signOut } = useAuth()

  if (!user) return null

  return (
    <SafeAreaView className="flex-1 bg-neutral-950">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Header */}
        <View className="px-6 pt-6">
          <Text className="text-neutral-400 text-sm">
            Account
          </Text>
          <Text className="text-white text-3xl font-semibold mt-1">
            Profile
          </Text>
        </View>

        {/* User Card */}
        <View className="mx-6 mt-6 rounded-2xl bg-neutral-900 p-5 border border-neutral-800">
          <View className="flex-row items-center">
            <Image
              source={{ uri: user.imageUrl }}
              className="h-16 w-16 rounded-full bg-neutral-800"
            />

            <View className="ml-4 flex-1">
              <Text className="text-white text-lg font-medium">
                {user.fullName || "Unnamed User"}
              </Text>
              <Text className="text-neutral-400 text-sm mt-1">
                {user.primaryEmailAddress?.emailAddress}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View className="mt-6 flex-row justify-between">
            <Metric icon={Briefcase} label="Tasks Posted" value="12" />
            <Metric icon={Star} label="Rating" value="4.8" />
            <Metric icon={Wallet} label="Total Spent" value="$1,240" />
          </View>
        </View>

        {/* Primary CTA */}
        <Pressable className="mx-6 mt-6 flex-row items-center justify-center rounded-xl bg-green-600 py-4">
          <PlusCircle size={20} color="white" />
          <Text className="ml-2 text-white font-semibold text-base">
            Post a New Task
          </Text>
        </Pressable>

        {/* Account Options */}
        <View className="mx-6 mt-8 rounded-2xl bg-neutral-900 border border-neutral-800">
          <ProfileRow
            icon={Briefcase}
            title="My Tasks"
            subtitle="View, edit, and manage tasks"
          />
          <Divider />

          <ProfileRow
            icon={Wallet}
            title="Payments & Billing"
            subtitle="Spending history and invoices"
          />
          <Divider />

          <ProfileRow
            icon={Settings}
            title="Account Settings"
            subtitle="Security, notifications, preferences"
          />
        </View>

        {/* Sign Out */}
        <Pressable
          onPress={() => signOut()}
          className="mx-6 mt-6 flex-row items-center justify-center rounded-xl border border-red-500 py-4"
        >
          <LogOut size={18} color="#ef4444" />
          <Text className="ml-2 text-red-500 font-semibold">
            Sign Out
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile

/* -----------------------------
   Supporting Components
------------------------------ */

const Metric = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) => (
  <View className="items-center">
    <Icon size={18} color="#22c55e" />
    <Text className="text-white font-semibold mt-1">
      {value}
    </Text>
    <Text className="text-neutral-400 text-xs mt-0.5">
      {label}
    </Text>
  </View>
)

const ProfileRow = ({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: any
  title: string
  subtitle: string
}) => (
  <Pressable className="flex-row items-center px-5 py-4">
    <Icon size={20} color="#22c55e" />
    <View className="ml-4">
      <Text className="text-white font-medium">
        {title}
      </Text>
      <Text className="text-neutral-400 text-sm mt-0.5">
        {subtitle}
      </Text>
    </View>
  </Pressable>
)

const Divider = () => (
  <View className="h-px bg-neutral-800 mx-5" />
)
