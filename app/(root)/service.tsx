"use client"

import { useState } from "react"
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"

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

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const API_BASE = process.env.NODE_ENV === "development" ?"http://localhost:8081" :"https://client-app-khaki-gamma.vercel.app"

  const handleSubmit = async () => {
    if (!formData.serviceType.trim()) {
      Alert.alert("Validation Error", "Please enter a service type")
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        Alert.alert("Success", "Service request added successfully!")
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
        Alert.alert("Error", result.error || "Failed to add service request")
      }
    } catch (error) {
      console.error("Error submitting service request:", error)
      Alert.alert("Network Error", "Please try again.")
    }
  }

  const handleServiceToggle = (service: string) => {
    const updatedServices = formData.selectedServices.includes(service)
      ? formData.selectedServices.filter((s) => s !== service)
      : [...formData.selectedServices, service]
    updateFormData({ selectedServices: updatedServices })
  }

  const closeModal = () => {
    setModalVisible(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Main Screen */}
      <View className="flex-1 justify-center items-center px-6">
        <Text className="text-2xl font-bold text-gray-800 mb-8 text-center">What kind of service do you need</Text>

        <TouchableOpacity
          className="bg-emerald-500 px-8 py-4 rounded-xl shadow-lg"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white font-semibold text-lg">Add Jobs</Text>
        </TouchableOpacity>
      </View>

      {/* Service Request Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-800">New Service Request</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Scrollable Form Content */}
            <ScrollView className="flex-1 px-4 py-6" contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Service Type Section */}
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

              {/* Timeline Section */}
              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Timeline</Text>
                <TextInput
                  placeholder="Start Date"
                  value={formData.startDate}
                  onChangeText={(text) => updateFormData({ startDate: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
                />
                <TextInput
                  placeholder="End Date"
                  value={formData.endDate}
                  onChangeText={(text) => updateFormData({ endDate: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3"
                />
              </View>

              {/* Pricing Section */}
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

              {/* Specialist Choice Section */}
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

              {/* Final Details Section */}
              <View className="mb-8">
                <Text className="text-xl font-semibold mb-4 text-gray-800">Final Details</Text>
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
                  placeholder="Attach Documents (link or notes)"
                  value={formData.documents}
                  onChangeText={(text) => updateFormData({ documents: text })}
                  className="border border-gray-300 rounded-lg px-4 py-3"
                />
              </View>
            </ScrollView>

            {/* Submit Button */}
            <View className="px-4 py-4 border-t border-gray-200">
              <TouchableOpacity className="bg-emerald-500 px-8 py-4 rounded-lg" onPress={handleSubmit}>
                <Text className="text-white font-semibold text-center text-lg">Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
