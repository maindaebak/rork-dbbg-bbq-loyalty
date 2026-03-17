import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { trpc, trpcClient } from "@/lib/trpc";
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
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="member-signup" options={{ headerBackTitle: "Welcome" }} />
      <Stack.Screen name="member-login" options={{ headerBackTitle: "Welcome" }} />
      <Stack.Screen name="member-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="member-profile" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="points-history" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="admin-login" options={{ headerBackTitle: "Welcome" }} />
      <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
      <Stack.Screen name="admin-members" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="admin-settings" options={{ headerBackTitle: "Dashboard" }} />
      <Stack.Screen name="terms-conditions" options={{ headerBackTitle: "Back" }} />
      <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminAuthProvider>
            <MembersStoreProvider>
              <LoyaltyProgramProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <RootLayoutNav />
                </GestureHandlerRootView>
              </LoyaltyProgramProvider>
            </MembersStoreProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
