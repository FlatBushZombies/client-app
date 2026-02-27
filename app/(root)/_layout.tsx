import { Tabs } from "expo-router"
import { Text, View, Platform } from "react-native"
import {
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  UserIcon,
  RocketLaunchIcon,
} from "react-native-heroicons/outline"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// Fix #4: derive height from content rather than magic number
const ICON_SIZE   = 20
const PILL_H      = 32   // h-8
const LABEL_H     = 12   // ~9.5px font + line height
const V_PADDING   = 10   // breathing room above icon + below label
const TAB_CONTENT = PILL_H + 4 + LABEL_H  // pill + gap-1 + label
const TAB_BAR_HEIGHT = TAB_CONTENT + V_PADDING * 2  // = 68

const TabIcon = ({
  Icon,
  focused,
  label,
}: {
  Icon: any
  focused: boolean
  label: string
}) => {
  return (
    <View className="items-center justify-center w-16 gap-1">

      {/* Icon pill */}
      <View
        className={`flex-row items-center justify-center rounded-[14px] w-11 h-8 ${
          focused ? "bg-green-700" : "bg-transparent"
        }`}
        style={{
          // Fix #1: glow only when focused, no shadow on unfocused
          shadowColor: "#1A7A4A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: focused ? 0.35 : 0,
          shadowRadius: 8,
          elevation: focused ? 4 : 0,
        }}
      >
        {focused && (
          <View className="absolute top-0 left-0 right-0 h-1/2 rounded-tl-[14px] rounded-tr-[14px] bg-white/10" />
        )}
        <Icon
          size={ICON_SIZE}
          color={focused ? "#FFFFFF" : "#9CA3AF"}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </View>

      {/* Fix #3: use registered Jakarta font families instead of font-bold/font-medium */}
      {/* Fix #5: "Tasks" instead of "My Tasks" to fit w-16 without truncation */}
      <Text
        numberOfLines={1}
        className={`text-[9.5px] tracking-[0.2px] ${
          focused
            ? "font-jakarta-bold text-green-700"
            : "font-jakarta-medium text-gray-400"
        }`}
      >
        {label}
      </Text>

    </View>
  )
}

export default function Layout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          elevation: 0,
          // Fix #1: consistent top separator + upward shadow on both platforms
          ...Platform.select({
            ios: {
              borderTopWidth: 0.5,
              borderTopColor: "#E5E7EB",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
            },
            android: {
              borderTopWidth: 0.5,
              borderTopColor: "#E5E7EB",
            },
          }),
        },
        // Fix #2: remove redundant justifyContent/alignItems that conflict with
        // Expo Router's own tab item centering logic
        tabBarItemStyle: {
          height: TAB_BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={HomeIcon} focused={focused} label="Home" />
          ),
        }}
      />

      <Tabs.Screen
        name="service"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={BriefcaseIcon} focused={focused} label="Jobs" />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={ChatBubbleLeftRightIcon} focused={focused} label="Chat" />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={UserIcon} focused={focused} label="Profile" />
          ),
        }}
      />

      {/* Fix #5: label shortened from "My Tasks" → "Tasks" to fit w-16 */}
      <Tabs.Screen
        name="applications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={RocketLaunchIcon} focused={focused} label="Tasks" />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}