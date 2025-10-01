"use client"

import { useState, useRef } from "react"
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, SafeAreaView, Alert } from "react-native"
import Swiper from "react-native-swiper"
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const swiperRef = useRef<Swiper | null>(null)

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

  const totalSteps = 5

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const API_BASE = "https://client-app-khaki-gamma.vercel.app";

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
     });

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
        swiperRef.current?.scrollBy(-currentIndex, false)
        setCurrentIndex(0)
      } else {
        Alert.alert("Error", result.error || "Failed to add service request")
      }
    } catch (error) {
      console.error("Error submitting service request:", error)
      Alert.alert("Network Error", "Please try again.")
    }
  }

  const handleNext = () => {
    if (currentIndex < totalSteps - 1) {
      swiperRef.current?.scrollBy(1, true)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) {
      swiperRef.current?.scrollBy(-1, true)
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
    swiperRef.current?.scrollBy(-currentIndex, false)
    setCurrentIndex(0)
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
                <Ionicons name="chevron-back" size={24} color="#374151" />
              </TouchableOpacity>
              <Text className="text-sm text-emerald-600 font-medium">
                {currentIndex + 1} of {totalSteps}
              </Text>
            </View>

            {/* Progress Bar */}
            <View className="px-4 py-3">
              <View className="w-full h-1 bg-gray-200 rounded-full mb-6">
                <View
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                />
              </View>
            </View>

            {/* Swiper Content */}
            <View className="flex-1">
              <Swiper
                ref={swiperRef}
                showsPagination={false}
                loop={false}
                onIndexChanged={(index: number) => setCurrentIndex(index)}
                scrollEnabled={false}
              >
                {/* Step 1: Service Type */}
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ flexGrow: 1 }}>
                  <ServiceTypeStep
                    formData={formData}
                    updateFormData={updateFormData}
                    onServiceToggle={handleServiceToggle}
                  />
                </ScrollView>

                {/* Step 2: Timeline */}
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ flexGrow: 1 }}>
                  <TimelineStep formData={formData} updateFormData={updateFormData} />
                </ScrollView>

                {/* Step 3: Pricing */}
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ flexGrow: 1 }}>
                  <PricingStep formData={formData} updateFormData={updateFormData} />
                </ScrollView>

                {/* Step 4: Specialist Choice */}
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ flexGrow: 1 }}>
                  <SpecialistChoiceStep formData={formData} updateFormData={updateFormData} />
                </ScrollView>

                {/* Step 5: Final Details */}
                <ScrollView className="flex-1 px-4" contentContainerStyle={{ flexGrow: 1 }}>
                  <FinalDetailsStep formData={formData} updateFormData={updateFormData} />
                </ScrollView>
              </Swiper>
            </View>

            {/* Navigation Buttons (Submit Now always visible) */}
            <View className="flex-row justify-between items-center px-4 py-4 border-t border-gray-200">
              <TouchableOpacity
                className={`px-6 py-3 rounded-lg ${currentIndex === 0 ? "opacity-50" : ""}`}
                onPress={handleBack}
                disabled={currentIndex === 0}
              >
                <Text className="text-gray-600 font-medium">Back</Text>
              </TouchableOpacity>

              <TouchableOpacity className="bg-emerald-500 px-8 py-3 rounded-lg" onPress={handleNext}>
                <Text className="text-white font-semibold">{currentIndex === totalSteps - 1 ? "Submit" : "Next"}</Text>
              </TouchableOpacity>

              <TouchableOpacity className="bg-gray-200 px-6 py-3 rounded-lg ml-2" onPress={handleSubmit}>
                <Text className="text-gray-700 font-medium">Submit Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

/* ---------------- Step Components ---------------- */
const ServiceTypeStep = ({
  formData,
  updateFormData,
  onServiceToggle,
}: {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
  onServiceToggle: (service: string) => void
}) => (
  <View className="flex-1">
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
          formData.selectedServices.includes(service) ? "bg-emerald-100 border-emerald-500" : "bg-white border-gray-300"
        }`}
        onPress={() => onServiceToggle(service)}
      >
        <Text className="text-gray-800">{service}</Text>
      </TouchableOpacity>
    ))}
  </View>
)

const TimelineStep = ({
  formData,
  updateFormData,
}: {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
}) => (
  <View className="flex-1">
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
)

const PricingStep = ({
  formData,
  updateFormData,
}: {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
}) => (
  <View className="flex-1">
    <Text className="text-xl font-semibold mb-4 text-gray-800">Pricing</Text>
    <TextInput
      placeholder="Maximum Price"
      value={formData.maxPrice}
      onChangeText={(text) => updateFormData({ maxPrice: text })}
      className="border border-gray-300 rounded-lg px-4 py-3"
      keyboardType="numeric"
    />
  </View>
)

const SpecialistChoiceStep = ({
  formData,
  updateFormData,
}: {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
}) => (
  <View className="flex-1">
    <Text className="text-xl font-semibold mb-4 text-gray-800">Specialist Choice</Text>
    {["Any Specialist", "Top Rated", "Most Affordable"].map((choice) => (
      <TouchableOpacity
        key={choice}
        className={`px-4 py-3 mb-2 rounded-lg border ${
          formData.specialistChoice === choice ? "bg-emerald-100 border-emerald-500" : "bg-white border-gray-300"
        }`}
        onPress={() => updateFormData({ specialistChoice: choice })}
      >
        <Text className="text-gray-800">{choice}</Text>
      </TouchableOpacity>
    ))}
  </View>
)

const FinalDetailsStep = ({
  formData,
  updateFormData,
}: {
  formData: FormData
  updateFormData: (updates: Partial<FormData>) => void
}) => (
  <View className="flex-1">
    <Text className="text-xl font-semibold mb-4 text-gray-800">Final Details</Text>
    <TextInput
      placeholder="Additional Information"
      value={formData.additionalInfo}
      onChangeText={(text) => updateFormData({ additionalInfo: text })}
      className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
      multiline
      numberOfLines={4}
    />
    <TextInput
      placeholder="Attach Documents (link or notes)"
      value={formData.documents}
      onChangeText={(text) => updateFormData({ documents: text })}
      className="border border-gray-300 rounded-lg px-4 py-3"
    />
  </View>
)
