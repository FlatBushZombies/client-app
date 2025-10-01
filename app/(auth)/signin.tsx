"use client";
import { useEffect } from "react";
import { View, Text, SafeAreaView } from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import OAuth from "@/components/OAuth";
import { router } from "expo-router";

const SignIn = () => {
  const { user, isLoaded } = useUser();
  const navigation = useNavigation();

  useEffect(() => {
    if (isLoaded && user) {
        router.push('/(root)/home')
    }
  }, [isLoaded, user]);

  // While checking session, optionally render nothing or a loader
  if (!isLoaded) return null;

  return (
    <SafeAreaView className="flex-1 justify-center items-center p-4">
      <Text className="text-2xl font-quicksand-bold mb-6">Welcome Back</Text>
      <OAuth />
    </SafeAreaView>
  );
};

export default SignIn;
