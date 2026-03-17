import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import { Lock, Mail, ShieldCheck } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { useAdminAuth } from "@/providers/admin-auth-provider";

export default function AdminLoginScreen() {
  const { login, isLoggingIn } = useAdminAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = useCallback(async () => {
    console.log("[AdminLogin] Attempting admin login");
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing fields", "Please enter both email and password.");
      return;
    }
    try {
      await login(email, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/admin-dashboard");
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login failed", "Invalid admin credentials. Please try again.");
    }
  }, [email, login, password]);

  return (
    <>
      <Stack.Screen options={{ title: "Staff Login", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Staff portal"
        subtitle="Sign in with your admin credentials to manage the loyalty program."
        title="Staff access."
        heroRight={
          <View style={styles.shieldBadge} testID="admin-login-badge">
            <ShieldCheck color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="admin-login-panel">
          <SectionTitle
            copy="Enter your admin email and password to continue."
            title="Admin sign in"
          />
          <InputField
            label="Email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="admin@dae-bak.com"
            testID="admin-email-input"
            value={email}
          />
          <InputField
            label="Password"
            onChangeText={setPassword}
            placeholder="Enter password"
            secureTextEntry
            testID="admin-password-input"
            value={password}
          />
          <ActionButton
            icon={Lock}
            label={isLoggingIn ? "Signing in..." : "Sign in as admin"}
            onPress={handleLogin}
            testID="admin-login-button"
            variant="primary"
          />
        </Panel>

        <Panel testID="admin-login-info-panel">
          <SectionTitle
            copy="This portal is restricted to authorized Dae Bak Bon Ga staff only."
            title="Staff only"
          />
          <View style={styles.infoRow}>
            <Mail color="#F7C58B" size={16} />
            <Text style={styles.infoText}>Contact management for access credentials</Text>
          </View>
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  infoText: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  shieldBadge: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
});
