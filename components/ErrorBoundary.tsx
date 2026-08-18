import { Component, type ReactNode } from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { COLORS, SHADOW } from "@/constants/theme"
import { RADIUS, SPACING } from "@/constants/layout"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

/**
 * Without this, any uncaught render error anywhere in the app (a bad prop,
 * a null access, a native-bridge edge case) crashes the whole app to a
 * force-close on production builds — no dev redbox to soften it, just gone.
 * This turns that into a recoverable "something went wrong" screen instead.
 * Deliberately resets on tap rather than auto-retrying, since an error that
 * fires immediately on remount would otherwise loop silently.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary] Caught render error:", error, info?.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", padding: SPACING.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: COLORS.infoSoft,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: SPACING.lg,
          }}
        >
          <Ionicons name="alert-circle-outline" size={32} color={COLORS.info} />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.textPrimary, marginBottom: SPACING.xs, textAlign: "center" }}>
          Something went wrong
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: SPACING.xl }}>
          That screen hit an unexpected error. Your data is safe — try again.
        </Text>
        <TouchableOpacity
          onPress={this.handleReset}
          activeOpacity={0.85}
          style={{
            borderRadius: RADIUS.pill,
            backgroundColor: COLORS.primary,
            paddingHorizontal: SPACING.xl,
            paddingVertical: SPACING.sm + 2,
            ...SHADOW.raised,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 15 }}>Try again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }
}
