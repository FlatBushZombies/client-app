import { Tabs } from "expo-router"
import { Text, View } from "react-native"
import { BriefcaseIcon, ChatBubbleLeftRightIcon, HomeIcon, UserIcon } from "react-native-heroicons/outline"
import { useSafeAreaInsets } from "react-native-safe-area-context"

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
    <View className="items-center justify-center w-20 mt-2">
      <View
        className={`mb-1 flex-row items-center justify-center rounded-full px-4 py-2 ${
          focused ? "bg-[#111827]" : "bg-transparent"
        }`}
      >
        <Icon
          size={22}
          color={focused ? "#FFFFFF" : "#9CA3AF"}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>

      <Text
        className={`mt-0.5 text-[11px] font-semibold tracking-wide ${
          focused ? "text-[#111827]" : "text-gray-400"
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
          borderTopWidth: 0.5,
          borderTopColor: "#E5E5EA",
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
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
    </Tabs>
  )
}
