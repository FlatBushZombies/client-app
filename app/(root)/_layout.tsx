import { Tabs } from "expo-router"
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native"
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
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"

// @callstack/liquid-glass is iOS 26+ only. Import conditionally so
// the app doesn't crash on Android or older iOS.
let LiquidGlassView: any = null
let isLiquidGlassSupported = false
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const lg = require("@callstack/liquid-glass")
  LiquidGlassView = lg.LiquidGlassView
  isLiquidGlassSupported = lg.isLiquidGlassSupported ?? false
} catch {}

const ACTIVE = "#16a34a"
const INACTIVE = "#94a3b8"
const BADGE_BG = "#ef4444"
const ICON_SIZE = 22

type RouteConfig = {
  name: string
  OutlineIcon: React.ElementType
  SolidIcon: React.ElementType
  label: string
  hasBadge?: boolean
}

const ROUTE_CONFIG: RouteConfig[] = [
  { name: "home",         OutlineIcon: HomeIcon,                SolidIcon: HomeSolid,       label: "Home"    },
  { name: "service",      OutlineIcon: BriefcaseIcon,           SolidIcon: BriefcaseSolid,  label: "Jobs"    },
  { name: "chat",         OutlineIcon: ChatBubbleLeftRightIcon, SolidIcon: ChatSolid,        label: "Chat"    },
  { name: "applications", OutlineIcon: RocketLaunchIcon,        SolidIcon: RocketSolid,      label: "Tasks",  hasBadge: true },
  { name: "profile",      OutlineIcon: UserIcon,                SolidIcon: UserSolid,        label: "Profile" },
]

function GlassTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()
  const { unreadCount } = useSocket()

  const useGlass = Platform.OS === "ios" && isLiquidGlassSupported && LiquidGlassView !== null

  const tabItems = ROUTE_CONFIG.map((config) => {
    const route = state.routes.find((r) => r.name === config.name)
    if (!route) return null
    const routeIndex = state.routes.indexOf(route)
    const focused = state.index === routeIndex
    const Icon = focused ? config.SolidIcon : config.OutlineIcon
    const badgeCount = config.hasBadge ? unreadCount : 0

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      })
      if (!focused && !event.defaultPrevented) {
        navigation.navigate(route.name)
      }
    }

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.tabItem}
      >
        <View style={styles.iconWrap}>
          <Icon
            size={ICON_SIZE}
            color={focused ? ACTIVE : INACTIVE}
            strokeWidth={focused ? 2.1 : 1.8}
          />
          {badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 99 ? "99+" : String(badgeCount)}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, focused && styles.labelActive]}>
          {config.label}
        </Text>
      </TouchableOpacity>
    )
  })

  const pillContent = <View style={styles.tabRow}>{tabItems}</View>

  return (
    <View
      style={[
        styles.outerWrap,
        { paddingBottom: Math.max(insets.bottom, 10) },
      ]}
      pointerEvents="box-none"
    >
      {useGlass ? (
        <LiquidGlassView
          style={styles.pill}
          effect="regular"
          interactive
        >
          {pillContent}
        </LiquidGlassView>
      ) : (
        <View style={[styles.pill, styles.pillFallback]}>
          {pillContent}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  outerWrap: {
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: "transparent",
  },
  pill: {
    borderRadius: 36,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  pillFallback: {
    backgroundColor: Platform.OS === "ios"
      ? "rgba(252,252,252,0.91)"
      : "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.055)",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    gap: 4,
  },
  iconWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -7,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 8.5,
    backgroundColor: BADGE_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    lineHeight: 11,
    fontFamily: "PlusJakartaSans_700Bold",
  },
  label: {
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.22,
    fontFamily: "PlusJakartaSans_500Medium",
    color: INACTIVE,
  },
  labelActive: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: ACTIVE,
  },
})

export default function Layout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="service" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="applications" />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  )
}
