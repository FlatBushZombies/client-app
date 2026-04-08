import { Tabs } from "expo-router"
import { Platform, Text, View } from "react-native"
import {
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  HomeIcon,
  RocketLaunchIcon,
  UserIcon,
} from "react-native-heroicons/outline"
import {
  BriefcaseIcon as BriefcaseSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  HomeIcon as HomeSolid,
  RocketLaunchIcon as RocketSolid,
  UserIcon as UserSolid,
} from "react-native-heroicons/solid"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useSocket } from "@/contexts/SocketContext"

const TAB_BAR_HEIGHT = 74
const TAB_SLOT_HEIGHT = 58
const ICON_SIZE = 21

const COLOR = {
  active: "#16a34a",
  activeLight: "#dcfce7",
  activeGlow: "#22c55e",
  inactive: "#94a3b8",
  bg: "#ffffff",
  border: "#f1f5f9",
  badge: "#ef4444",
}

const TabIcon = ({
  IconOutline,
  IconSolid,
  focused,
  label,
  badgeCount = 0,
}: {
  IconOutline: any
  IconSolid: any
  focused: boolean
  label: string
  badgeCount?: number
}) => {
  const Icon = focused ? IconSolid : IconOutline
  const badgeLabel = badgeCount > 99 ? "99+" : badgeCount.toString()

  return (
    <View
      style={{
        width: 68,
        height: TAB_SLOT_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 4,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 4,
          width: focused ? 18 : 0,
          height: 3,
          borderRadius: 999,
          backgroundColor: focused ? COLOR.active : "transparent",
          opacity: focused ? 1 : 0,
        }}
      />

      <View
        style={{
          width: 44,
          height: 34,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? COLOR.activeLight : "transparent",
          overflow: "hidden",
          ...(focused
            ? Platform.select({
                ios: {
                  shadowColor: COLOR.activeGlow,
                  shadowOffset: { width: 0, height: 5 },
                  shadowOpacity: 0.24,
                  shadowRadius: 12,
                },
                android: {
                  elevation: 4,
                },
              })
            : {}),
        }}
      >
        {focused ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "52%",
              backgroundColor: "rgba(255,255,255,0.28)",
            }}
          />
        ) : null}

        <Icon
          size={ICON_SIZE}
          color={focused ? COLOR.active : COLOR.inactive}
          strokeWidth={focused ? 2.05 : 1.8}
        />

        {badgeCount > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 2,
              right: 0,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderRadius: 9,
              backgroundColor: COLOR.badge,
              borderWidth: 1,
              borderColor: COLOR.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: "#ffffff",
                fontSize: 9,
                lineHeight: 11,
                fontFamily: "PlusJakartaSans-Bold",
              }}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={{
          marginTop: 4,
          fontSize: 10,
          lineHeight: 13,
          letterSpacing: 0.24,
          fontFamily: focused ? "PlusJakartaSans-Bold" : "PlusJakartaSans-Medium",
          color: focused ? COLOR.active : COLOR.inactive,
        }}
      >
        {label}
      </Text>
    </View>
  )
}

export default function Layout() {
  const insets = useSafeAreaInsets()
  const { unreadCount } = useSocket()

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: COLOR.bg,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopWidth: 1,
          borderTopColor: COLOR.border,
          elevation: 0,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -7 },
              shadowOpacity: 0.05,
              shadowRadius: 18,
            },
          }),
        },
        tabBarItemStyle: {
          height: TAB_BAR_HEIGHT,
          justifyContent: "center",
          alignItems: "center",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconOutline={HomeIcon}
              IconSolid={HomeSolid}
              focused={focused}
              label="Home"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="service"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconOutline={BriefcaseIcon}
              IconSolid={BriefcaseSolid}
              focused={focused}
              label="Jobs"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconOutline={ChatBubbleLeftRightIcon}
              IconSolid={ChatSolid}
              focused={focused}
              label="Chat"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconOutline={UserIcon}
              IconSolid={UserSolid}
              focused={focused}
              label="Profile"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="applications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              IconOutline={RocketLaunchIcon}
              IconSolid={RocketSolid}
              focused={focused}
              label="Tasks"
              badgeCount={unreadCount}
            />
          ),
        }}
      />

      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  )
}
