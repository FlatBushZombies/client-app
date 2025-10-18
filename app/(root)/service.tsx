"use client"

import { useState, useCallback } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useUser, useAuth } from "@clerk/clerk-expo"

interface FormData {
  serviceType: string
  selectedServices: string[]
  startDate: string
  endDate: string
  maxPrice: string
  specialistChoice: string
  additionalInfo: string
  documents: string
}

export default function ServiceRequestScreen() {
  const [modalVisible, setModalVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, isLoaded } = useUser()
  const { getToken, isSignedIn } = useAuth()

  const [formData, setFormData] = useState<FormData>({
    serviceType: "",
    selectedServices: [],
    startDate: "",
    endDate: "",
    maxPrice: "",
    specialistChoice: "",
    additionalInfo: "",
    documents: "",
  })

  // ✅ Use the backend URL (ensure CORS is configured there)
  const API_BASE = "https://quickhands-api.vercel.app"
  
  // Test API connectivity
  const testAPIConnectivity = async () => {
    try {
      console.log("🔄 Testing API connectivity...")
      const response = await fetch(`${API_BASE}/health`)
      const result = await response.text()
      console.log("🌐 API Health Check:", response.status, result)
      return response.ok
    } catch (error) {
      console.error("🚫 API connectivity test failed:", error)
      return false
    }
  }
  
  // Test auth endpoint specifically
  const testAuthEndpoint = async (testToken: string) => {
    try {
      console.log("🔐 Testing auth endpoint with token...")
      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: "GET", // Just test GET first
        headers: {
          "Authorization": `Bearer ${testToken}`,
          "Content-Type": "application/json"
        }
      })
      const result = await response.text()
      console.log("🔐 Auth endpoint test:", {
        status: response.status,
        statusText: response.statusText,
        body: result.substring(0, 200) + (result.length > 200 ? "..." : "")
      })
      return { success: response.ok, status: response.status, body: result }
    } catch (error) {
      console.error("🚫 Auth endpoint test failed:", error)
      return { success: false, error: error.message }
    }
  }

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleServiceToggle = (service: string) => {
    const updated = formData.selectedServices.includes(service)
      ? formData.selectedServices.filter((s) => s !== service)
      : [...formData.selectedServices, service]
    updateFormData({ selectedServices: updated })
  }

  const closeModal = () => setModalVisible(false)

  const handleSubmit = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) {
      Alert.alert("Authentication Required", "Please sign in before creating a job request.")
      return
    }

    if (!formData.serviceType || !formData.startDate || !formData.endDate || !formData.maxPrice) {
      Alert.alert("Missing Fields", "Please fill all required fields.")
      return
    }

    try {
      setLoading(true)
      
      // Test API connectivity first
      const isAPIConnected = await testAPIConnectivity()
      if (!isAPIConnected) {
        Alert.alert("Connection Error", "Unable to connect to the backend API. Please check your internet connection.")
        setLoading(false)
        return
      }

      // ✅ Get JWT token from Clerk - try multiple methods
      let token: string | null = null
      
      console.log("🔍 Starting token retrieval process...")
      console.log("Current user before token retrieval:", {
        id: user?.id,
        isLoaded,
        isSignedIn,
        sessionId: user?.sessionId || 'No session ID'
      })
      
      try {
        // Try getting token with default template first
        console.log("🔄 Attempting to get default token...")
        token = await getToken()
        console.log("🔑 Got default token:", token ? "✅ Success" : "❌ Failed")
        if (token) {
          console.log("🔍 Default token details:")
          console.log("- Length:", token.length)
          console.log("- Starts with:", token.substring(0, 20) + "...")
          console.log("- Contains dots (JWT structure):", (token.match(/\./g) || []).length)
        }
      } catch (error) {
        console.warn("❌ Default token failed:", error)
        console.warn("Error details:", {
          message: error.message,
          name: error.name,
          stack: error.stack?.substring(0, 200) + "..."
        })
      }
      
      // If no token, try with backend-api template
      if (!token) {
        try {
          token = await getToken({ template: "backend-api" })
          console.log("🔑 Got backend-api token:", token ? "✅ Success" : "❌ Failed")
        } catch (error) {
          console.warn("Backend-api token failed:", error)
        }
      }
      
      // If still no token, try with session token
      if (!token) {
        try {
          token = await getToken({ template: "default" })
          console.log("🔑 Got default template token:", token ? "✅ Success" : "❌ Failed")
        } catch (error) {
          console.warn("Default template token failed:", error)
        }
      }
      
      if (!token) {
        Alert.alert("Auth Error", "Unable to retrieve authentication token. Please try signing out and back in.")
        setLoading(false)
        return
      }
      
      console.log("🔑 Using token (first 20 chars):", token.substring(0, 20) + "...")
      
      // Test authentication with the backend before proceeding
      console.log("🧪 Testing token with backend...")
      const authTest = await testAuthEndpoint(token)
      console.log("🧪 Auth test result:", authTest)

      // ✅ Build payload to match backend
      const payload = {
        serviceType: formData.serviceType,
        selectedServices: formData.selectedServices,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxPrice: Number(formData.maxPrice),
        specialistChoice: formData.specialistChoice,
        additionalInfo: formData.additionalInfo,
        documents: formData.documents
          ? formData.documents.split(",").map((d) => d.trim())
          : [],
        // Clerk user info
        clerkId: user.id,
        userName: user.fullName || user.username || "Anonymous",
        userAvatar: user.imageUrl || null,
      }

      console.log("🔢 Sending job payload:", payload)
      console.log("🌐 API Endpoint:", `${API_BASE}/api/jobs`)
      console.log("📦 Request headers:", {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token.substring(0, 20)}...`
      })

      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const text = await response.text()
      let result: any = null
      try {
        result = text ? JSON.parse(text) : null
      } catch {
        result = { raw: text }
      }

      console.log("🔡 Job creation response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: result
      })
      
      // If 401, provide specific debugging info
      if (response.status === 401) {
        console.error("🚫 Authentication failed - Details:")
        console.error("=== TOKEN INFO ===")
        console.error("Token exists:", !!token)
        console.error("Token length:", token?.length || "null")
        console.error("Token preview (first 50 chars):", token?.substring(0, 50) + "...")
        
        console.error("=== USER INFO ===")
        console.error("User object:", JSON.stringify({
          id: user?.id,
          fullName: user?.fullName,
          firstName: user?.firstName,
          lastName: user?.lastName,
          emailAddress: user?.primaryEmailAddress?.emailAddress,
          username: user?.username,
          imageUrl: user?.imageUrl,
          createdAt: user?.createdAt,
          updatedAt: user?.updatedAt
        }, null, 2))
        
        console.error("=== AUTH STATE ===")
        console.error("Is loaded:", isLoaded)
        console.error("Is signed in:", isSignedIn)
        
        console.error("=== PAYLOAD SENT ===")
        console.error("Payload user info:", JSON.stringify({
          clerkId: user?.id,
          userName: user?.fullName || user?.username || "Anonymous",
          userAvatar: user?.imageUrl || null,
        }, null, 2))
        
        console.error("=== RESPONSE INFO ===")
        console.error("Response status:", response.status)
        console.error("Response headers:", Object.fromEntries(response.headers.entries()))
        console.error("Response body:", result)
      }

      if (response.status === 201 && result?.success) {
        Alert.alert("Success", "Service request created successfully!")
        setFormData({
          serviceType: "",
          selectedServices: [],
          startDate: "",
          endDate: "",
          maxPrice: "",
          specialistChoice: "",
          additionalInfo: "",
          documents: "",
        })
        setModalVisible(false)
      } else {
        let errorMsg = result?.message || result?.error || `Request failed with status ${response.status}`
        
        if (response.status === 401) {
          errorMsg = "Authentication failed. This might be due to:\n• JWT token configuration mismatch between app and backend\n• Backend not recognizing Clerk tokens\n• Token template not configured properly\n\nTry signing out and back in, or check backend authentication setup."
        }
        
        Alert.alert(
          response.status === 401 ? "Authentication Error" : "Error", 
          errorMsg
        )
      }
    } catch (error) {
      console.error("🔥 Job creation error:", error)
      Alert.alert("Network Error", "Could not create the job request. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [formData, user, isLoaded, isSignedIn])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-800 mb-8 text-center">
          What kind of service do you need?
        </Text>

        <TouchableOpacity
          className="bg-emerald-500 px-8 py-4 rounded-xl shadow-lg"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white font-semibold text-lg">Add Job</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-800">New Service Request</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 20 }}>
              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Service Type</Text>
                <TextInput
                  placeholder="Enter service type"
                  value={formData.serviceType}
                  onChangeText={(text) => updateFormData({ serviceType: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
                />

                <Text className="text-lg font-medium text-gray-700 mb-2">Select Services</Text>
                {["Plumbing", "Electrical", "Cleaning"].map((service) => (
                  <TouchableOpacity
                    key={service}
                    className={`px-4 py-3 mb-2 rounded-lg border ${
                      formData.selectedServices.includes(service)
                        ? "bg-emerald-100 border-emerald-500"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => handleServiceToggle(service)}
                  >
                    <Text className="text-gray-800">{service}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Timeline</Text>
                <TextInput
                  placeholder="Start Date (YYYY-MM-DD)"
                  value={formData.startDate}
                  onChangeText={(text) => updateFormData({ startDate: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
                />
                <TextInput
                  placeholder="End Date (YYYY-MM-DD)"
                  value={formData.endDate}
                  onChangeText={(text) => updateFormData({ endDate: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3"
                />
              </View>

              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Pricing</Text>
                <TextInput
                  placeholder="Maximum Price"
                  value={formData.maxPrice}
                  onChangeText={(text) => updateFormData({ maxPrice: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3"
                  keyboardType="numeric"
                />
              </View>

              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Specialist Choice</Text>
                {["Any Specialist", "Top Rated", "Most Affordable"].map((choice) => (
                  <TouchableOpacity
                    key={choice}
                    className={`px-4 py-3 mb-2 rounded-lg border ${
                      formData.specialistChoice === choice
                        ? "bg-emerald-100 border-emerald-500"
                        : "bg-white border-gray-300"
                    }`}
                    onPress={() => updateFormData({ specialistChoice: choice })}
                  >
                    <Text className="text-gray-800">{choice}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Additional Info</Text>
                <TextInput
                  placeholder="Additional Information"
                  value={formData.additionalInfo}
                  onChangeText={(text) => updateFormData({ additionalInfo: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TextInput
                  placeholder="Attach Documents (comma-separated URLs)"
                  value={formData.documents}
                  onChangeText={(text) => updateFormData({ documents: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3"
                />
              </View>
            </ScrollView>

            <View className="px-4 py-4 border-t border-gray-200">
              <TouchableOpacity
                className="bg-emerald-500 px-8 py-4 rounded-lg flex-row justify-center items-center"
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-center text-lg">Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
