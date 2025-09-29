import { router } from "expo-router";
import { Text, View, Image, TouchableOpacity } from "react-native";
import { IMAGES } from "@/constants";

export default function Index() {

  const handleSignIn = () => {
    router.replace('/')
  }
  return (
        <View className="flex-1 bg-white justify-between px-8 py-16">
      {/* Content Container */}
      <View className="flex-1 justify-center items-center">
        {/* Title */}
        <Text className="text-5xl font-quicksand-bold text-gray-900 mb-12 text-center leading-tight px-4">
          Find specialist to 
help you with your
task
        </Text>

        {/* Illustration */}
        <View className="items-center justify-center mb-16 w-full">
          <View className="bg-gray-50 rounded-3xl p-8 shadow-sm">
            <Image source={IMAGES.client} className="w-80 h-52 rounded-2xl" resizeMode="contain" />
          </View>
        </View>
      </View>

      {/* Buttons Container */}
      <View className="w-full items-center space-y-6">
        <TouchableOpacity
          className="bg-primary rounded-2xl py-5 px-8 w-full items-center shadow-lg active:bg-gray-800"
          onPress={handleSignIn}
          activeOpacity={0.9}
        >
          <Text className="text-white font-quicksand-semibold text-lg">I want to look for services</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-white rounded-2xl py-5 px-8 w-full items-center shadow-lg active:bg-gray-800"
          onPress={handleSignIn}
          activeOpacity={0.9}
        >
          <Text className="text-black font-quicksand-semibold text-lg">I want to offer my services</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
