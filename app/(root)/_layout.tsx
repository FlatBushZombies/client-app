import { Tabs } from "expo-router"
import { Text, View, Platform } from "react-native"
import { BriefcaseIcon, ChatBubbleLeftRightIcon, HomeIcon, UserIcon, RocketLaunchIcon } from "react-native-heroicons/outline"
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
    <View style={{
      alignItems: "center",
      justifyContent: "center",
      width: 64,
      gap: 4,
    }}>
      {/* Icon pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          width: 44,
          height: 32,
          backgroundColor: focused ? "#1A7A4A" : "transparent",
          // Premium glow effect when focused
          shadowColor: focused ? "#1A7A4A" : "transparent",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: focused ? 0.35 : 0,
          shadowRadius: 8,
          elevation: focused ? 4 : 0,
        }}
      >
        {/* Subtle inner highlight for depth */}
        {focused && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "50%",
              borderTopLeftRadius: 14,
              borderTopRightRadius: 14,
              backgroundColor: "rgba(255,255,255,0.12)",
            }}
          />
        )}
        <Icon
          size={20}
          color={focused ? "#FFFFFF" : "#9CA3AF"}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </View>

      {/* Label */}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9.5,
          fontWeight: focused ? "700" : "500",
          letterSpacing: 0.2,
          color: focused ? "#1A7A4A" : "#9CA3AF",
        }}
      >
        {label}
      </Text>
    </View>
  )
}

export default function Layout() {
  const insets = useSafeAreaInsets()
  const TAB_BAR_HEIGHT = 60

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          elevation: 0,
          // Crisp top border + premium shadow
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          // Hairline separator
          borderTopColor: "#F0F0F0",
          ...Platform.select({
            android: { borderTopWidth: 0.5, borderTopColor: "#E5E7EB" },
          }),
        },
        tabBarItemStyle: {
          // Each item fills the height and centers the icon+label vertically
          height: TAB_BAR_HEIGHT,
          paddingTop: 0,
          paddingBottom: 0,
          justifyContent: "center",
          alignItems: "center",
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

      <Tabs.Screen
        name="applications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={RocketLaunchIcon} focused={focused} label="Apply" />
          ),
        }}
      />
    </Tabs>
  )
}