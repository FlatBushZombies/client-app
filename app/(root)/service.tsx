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

  const API_BASE = "https://quickhands-api.vercel.app"

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const handleServiceToggle = (service: string) => {
    const updated = formData.selectedServices.includes(service)
      ? formData.selectedServices.filter((s) => s !== service)
      : [...formData.selectedServices, service]

    updateFormData({ selectedServices: updated })
  }

  const handleSubmit = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user) {
      Alert.alert("Authentication Required", "Please sign in first.")
      return
    }

    if (!formData.serviceType || !formData.startDate || !formData.endDate || !formData.maxPrice) {
      Alert.alert("Missing Fields", "Please complete all required fields.")
      return
    }

    try {
      setLoading(true)

      const token = await getToken()
      if (!token) throw new Error("Token missing")

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
        clerkId: user.id,
        userName: user.fullName || "Anonymous",
        userAvatar: user.imageUrl || null,
      }

      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (response.status === 201 && result?.success) {
        Alert.alert("Success", "Service request created successfully.")
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
        Alert.alert("Error", result?.message || "Request failed.")
      }
    } catch (err) {
      Alert.alert("Network Error", "Please try again.")
    } finally {
      setLoading(false)
    }
  }, [formData, user, isLoaded, isSignedIn])

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* ENTRY SCREEN */}
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-gray-900 mb-3">
          Post a task in minutes
        </Text>
        <Text className="text-base text-gray-600 mb-8">
          Tell us what you need and get matched with trusted professionals.
        </Text>

        <TouchableOpacity
          className="bg-emerald-600 py-4 px-6 rounded-2xl shadow-md self-start"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white font-semibold text-lg">
            Create a Job
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODAL */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50">
          {/* HEADER */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              New Service Request
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView className="px-5 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
            {/* SERVICE TYPE */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold mb-3">Service Type</Text>
              <TextInput
                placeholder="e.g. Plumbing, Cleaning"
                value={formData.serviceType}
                onChangeText={(text) => updateFormData({ serviceType: text })}
                className="bg-gray-50 rounded-xl px-4 py-3"
              />

              <View className="flex-row flex-wrap gap-3 mt-4">
                {["Plumbing", "Electrical", "Cleaning"].map((service) => {
                  const active = formData.selectedServices.includes(service)
                  return (
                    <TouchableOpacity
                      key={service}
                      onPress={() => handleServiceToggle(service)}
                      className={`px-4 py-2 rounded-full border ${
                        active
                          ? "bg-emerald-600 border-emerald-600"
                          : "bg-gray-100 border-gray-200"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium ${
                          active ? "text-white" : "text-gray-700"
                        }`}
                      >
                        {service}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* TIMELINE */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold mb-3">Timeline</Text>
              <View className="flex-row gap-4">
                <TextInput
                  placeholder="Start date"
                  value={formData.startDate}
                  onChangeText={(text) => updateFormData({ startDate: text })}
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-3"
                />
                <TextInput
                  placeholder="End date"
                  value={formData.endDate}
                  onChangeText={(text) => updateFormData({ endDate: text })}
                  className="flex-1 bg-gray-50 rounded-xl px-4 py-3"
                />
              </View>
            </View>

            {/* PRICING */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold mb-3">Budget</Text>
              <TextInput
                placeholder="Maximum price"
                value={formData.maxPrice}
                onChangeText={(text) => updateFormData({ maxPrice: text })}
                keyboardType="numeric"
                className="bg-gray-50 rounded-xl px-4 py-3"
              />
            </View>

            {/* SPECIALIST */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold mb-3">Specialist Preference</Text>

              {["Any Specialist", "Top Rated", "Most Affordable"].map((choice) => {
                const active = formData.specialistChoice === choice
                return (
                  <TouchableOpacity
                    key={choice}
                    onPress={() => updateFormData({ specialistChoice: choice })}
                    className={`p-4 mb-3 rounded-xl border ${
                      active
                        ? "bg-emerald-50 border-emerald-600"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className="font-medium text-gray-900">{choice}</Text>
                    <Text className="text-sm text-gray-500 mt-1">
                      {choice === "Any Specialist" && "We’ll match you automatically"}
                      {choice === "Top Rated" && "Highest reviewed professionals"}
                      {choice === "Most Affordable" && "Lowest cost options"}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* ADDITIONAL INFO */}
            <View className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
              <Text className="text-lg font-semibold mb-3">Additional Details</Text>
              <TextInput
                placeholder="Describe your task..."
                value={formData.additionalInfo}
                onChangeText={(text) => updateFormData({ additionalInfo: text })}
                multiline
                numberOfLines={4}
                className="bg-gray-50 rounded-xl px-4 py-3 mb-4"
              />
              <TextInput
                placeholder="Document URLs (optional)"
                value={formData.documents}
                onChangeText={(text) => updateFormData({ documents: text })}
                className="bg-gray-50 rounded-xl px-4 py-3"
              />
            </View>
          </ScrollView>

          {/* FOOTER CTA */}
          <View className="px-5 py-4 border-t border-gray-200 bg-white">
            <TouchableOpacity
              className="bg-emerald-600 py-4 rounded-2xl"
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-lg text-center">
                  Post Job Request
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
