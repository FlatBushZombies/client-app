"use client"

import { IMAGES } from "@/constants"
import { useAuth, useUser } from "@clerk/clerk-expo"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native"

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.42

const serviceProviders = [
  {
    id: 1,
    title: "Plumber",
    providerCount: 1284,
    image: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#E8F4FD", "#B8D4E8"],
  },
  {
    id: 2,
    title: "Electrician",
    providerCount: 967,
    image: "https://images.unsplash.com/photo-1682345262055-8f95f3c513ea?q=80&w=1170&auto=format&fit=crop?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#FEF3C7", "#FCD34D"],
  },
  {
    id: 3,
    title: "Carpenter",
    providerCount: 543,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#D1FAE5", "#6EE7B7"],
  },
  {
    id: 4,
    title: "Painter",
    providerCount: 412,
    image: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400&h=500&fit=crop&crop=faces",
    bgColor: ["#FCE7F3", "#F9A8D4"],
  },
]

const HomeScreen = () => {
  const { user, isLoaded } = useUser()
  const { isSignedIn } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn) {
      router.replace("/")
    } else {
      setCheckingAuth(false)
    }
  }, [isLoaded, isSignedIn])

  if (checkingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FAFAFA" }}>
        <Text style={{ color: "#6B7280", fontSize: 16 }}>Checking session...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FAFAFA" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#FFFFFF",
        }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image
              source={{ uri: user?.imageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=faces" }}
              style={{ width: 48, height: 48, borderRadius: 24, marginRight: 12 }}
            />
            <View>
              <Text style={{ color: "#9CA3AF", fontSize: 14 }}>Hello 👋</Text>
              <Text style={{ color: "#111827", fontSize: 18, fontWeight: "700" }}>
                {user?.fullName || "User"}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={{
            backgroundColor: "#F3F4F6",
            borderRadius: 12,
            padding: 10,
          }}>
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            <View style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              backgroundColor: "#EF4444",
              borderRadius: 4,
            }} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#FFFFFF",
        }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F9FAFB",
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Search for a specialist or service"
              style={{
                flex: 1,
                marginLeft: 12,
                color: "#374151",
                fontSize: 16,
              }}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Hero Illustration */}
        <Image
          source={IMAGES.provider}
          style={{ width: "100%", height: 200 }}
          resizeMode="cover"
        />

        {/* Popular Services Section */}
        <View style={{ paddingTop: 24 }}>
          <View style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            marginBottom: 16,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#111827",
            }}>
              Popular Services
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#0EA5E9" }}>
                View all
              </Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Scrolling Cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
          >
            {serviceProviders.map((provider) => (
              <TouchableOpacity
                key={provider.id}
                activeOpacity={0.9}
                style={{
                  width: CARD_WIDTH,
                  marginHorizontal: 6,
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: "#FFFFFF",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                {/* Card Background with Gradient */}
                <LinearGradient
                  colors={provider.bgColor}
                  style={{
                    height: 200,
                    justifyContent: "flex-end",
                  }}
                >
                  {/* Provider Count Badge */}
                  <View style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "rgba(255,255,255,0.9)",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}>
                    <Ionicons name="people" size={14} color="#374151" />
                    <Text style={{
                      marginLeft: 4,
                      fontSize: 12,
                      fontWeight: "600",
                      color: "#374151",
                    }}>
                      {provider.providerCount.toLocaleString()}
                    </Text>
                  </View>

                  {/* Professional Image */}
                  <Image
                    source={{ uri: provider.image }}
                    style={{
                      width: "100%",
                      height: 180,
                      resizeMode: "cover",
                    }}
                  />
                </LinearGradient>

                {/* Title Section */}
                <View style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  backgroundColor: "#FFFFFF",
                }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#111827",
                  }}>
                    {provider.title}
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: "#6B7280",
                    marginTop: 2,
                  }}>
                    {provider.providerCount} providers available
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, paddingTop: 28, paddingBottom: 32 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: "700",
            color: "#111827",
            marginBottom: 16,
          }}>
            How it works
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              marginRight: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{
                width: 44,
                height: 44,
                backgroundColor: "#DBEAFE",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}>
                <Ionicons name="search" size={22} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                Find a Pro
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                Search verified professionals
              </Text>
            </View>

            <View style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              padding: 16,
              marginLeft: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 2,
            }}>
              <View style={{
                width: 44,
                height: 44,
                backgroundColor: "#FEF3C7",
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}>
                <Ionicons name="star" size={22} color="#F59E0B" />
              </View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#111827" }}>
                Read Reviews
              </Text>
              <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>
                Real ratings from customers
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA Button */}
      <View style={{
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
      }}>
        <TouchableOpacity
          onPress={() => router.push("/(root)/service")}
          style={{
          backgroundColor: "#111827",
          borderRadius: 16,
          paddingVertical: 16,
          alignItems: "center",
          shadowColor: "#111827",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        }}>
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            Post Your Task
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

export default HomeScreen