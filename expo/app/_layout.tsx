import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AdminAuthProvider } from "@/providers/admin-auth-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { LoyaltyProgramProvider } from "@/providers/loyalty-program-provider";
import { MembersStoreProvider } from "@/providers/members-store-provider";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="member-signup" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="member-login" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="member-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="member-profile" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="points-history" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="admin-login" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin-members" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="admin-member-detail" options={{ headerBackTitle: "Search" }} />
      <Stack.Screen name="admin-marketing" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="admin-notifications" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="admin-settings" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="settings-points" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-tiers" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-rewards" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-membership-rewards" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-member-perks" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-visit-badges" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-privacy" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="settings-terms" options={{ headerBackTitle: "Settings" }} />
      <Stack.Screen name="rewards" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="membership-rewards" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="terms-conditions" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="forgot-password" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="privacy-policy" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const meta = document.createElement("meta");
      meta.name = "google-adsense-account";
      meta.content = "ca-pub-7133225364355808";
      document.head.appendChild(meta);

      const script = document.createElement("script");
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7133225364355808";
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(meta);
        document.head.removeChild(script);
      };
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminAuthProvider>
            <MembersStoreProvider>
              <LoyaltyProgramProvider>
                {Platform.OS === "web" ? (
                  <View style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </View>
                ) : (
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <RootLayoutNav />
                  </GestureHandlerRootView>
                )}
              </LoyaltyProgramProvider>
            </MembersStoreProvider>
          </AdminAuthProvider>
        </AuthProvider>
    </QueryClientProvider>
  );
}
