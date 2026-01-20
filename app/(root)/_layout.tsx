import { Tabs } from "expo-router"
import { View, Text } from "react-native"
import { HomeIcon } from "react-native-heroicons/outline"
import { BriefcaseIcon } from "react-native-heroicons/outline"
import { ChatBubbleLeftRightIcon } from "react-native-heroicons/outline"
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
    <View className="items-center justify-center">
      <View
        className={`mb-1 rounded-full px-4 py-2 ${
          focused ? "bg-black/5" : "bg-transparent"
        }`}
      >
        <Icon
          size={22}
          color={focused ? "#000000" : "#8E8E93"}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>

      <Text
        className={`text-xs font-medium ${
          focused ? "text-black" : "text-gray-400"
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
    </Tabs>
  )
}
