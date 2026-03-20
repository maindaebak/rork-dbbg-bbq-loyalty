import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import { KeyRound, LogIn, Phone } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { PhoneInput, DEFAULT_COUNTRY_CODE, type CountryCode } from "@/components/loyalty/phone-input";
import { memberLoginWithPassword } from "@/lib/api";
import { useAuth, type MemberProfile } from "@/providers/auth-provider";
import { useMembersStore } from "@/providers/members-store-provider";

export default function MemberLoginScreen() {
  const { login } = useAuth();
  const { findMemberByPhone } = useMembersStore();
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [password, setPassword] = useState<string>("");
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const fullPhone = useMemo(() => {
    const digits = phoneNumber.replace(/[^\d]/g, "");
    return `${countryCode.dial}${digits}`;
  }, [countryCode.dial, phoneNumber]);

  const canLogin = useMemo<boolean>(
    () => phoneNumber.replace(/[^\d]/g, "").length >= 7 && password.length >= 6,
    [phoneNumber, password],
  );

  const handleLogin = useCallback(async () => {
    if (!canLogin) {
      Alert.alert("Missing info", "Please enter your phone number and password.");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoggingIn(true);

    try {
      const phoneToSend = fullPhone;
      console.log("[Login] Logging in with phone:", phoneToSend);
      const result = await memberLoginWithPassword(phoneToSend, password);
      console.log("[Login] Login result:", JSON.stringify(result));

      if (!result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login failed", result.error ?? "Invalid phone number or password. Please try again.");
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const existingMember = findMemberByPhone(fullPhone);
      const member: MemberProfile = existingMember
        ? {
            id: existingMember.id,
            fullName: existingMember.fullName,
            phone: existingMember.phone,
            birthdate: existingMember.birthdate,
            birthYear: existingMember.birthYear,
            createdAt: existingMember.createdAt,
          }
        : {
            id: `member-${Date.now()}`,
            fullName: "Returning Member",
            phone: fullPhone,
            birthdate: "",
            birthYear: "",
            createdAt: new Date().toISOString(),
          };

      console.log("[Login] Member logged in:", member.fullName);
      login(member);
      router.replace("/member-dashboard");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[Login] Login error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login failed", msg);
    } finally {
      setIsLoggingIn(false);
    }
  }, [canLogin, findMemberByPhone, fullPhone, login, password]);

  return (
    <>
      <Stack.Screen options={{ title: "Log in", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Welcome back"
        subtitle="Log in with your phone number and password."
        title="Log in to your rewards."
        heroRight={
          <View style={styles.statusPill} testID="login-status">
            <Phone color="#F7C58B" size={18} />
            <Text style={styles.statusText}>Member</Text>
          </View>
        }
      >
        <Panel testID="login-phone-panel">
          <SectionTitle
            copy="Enter the phone number and password linked to your account."
            title="Your credentials"
          />
          <PhoneInput
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phoneNumber={phoneNumber}
            onPhoneNumberChange={setPhoneNumber}
            testID="login-phone-input"
          />

          <View style={styles.passwordSection}>
            <View style={styles.passwordHeader}>
              <KeyRound color="#F7C58B" size={16} />
              <Text style={styles.passwordHeaderText}>Password</Text>
            </View>
            <InputField
              label="Password"
              onChangeText={setPassword}
              placeholder="Enter your password"
              testID="login-password-input"
              value={password}
              secureTextEntry
            />
          </View>

          <ActionButton
            icon={LogIn}
            label={isLoggingIn ? "Logging in..." : "Log in"}
            onPress={handleLogin}
            testID="login-button"
            variant="primary"
          />
        </Panel>

        <Panel testID="login-signup-redirect-panel">
          <SectionTitle
            copy="Don't have a rewards account yet?"
            title="New here?"
          />
          <ActionButton
            icon={LogIn}
            label="Sign up instead"
            onPress={() => router.replace("/member-signup")}
            testID="login-go-signup-button"
            variant="secondary"
          />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  statusPill: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusText: {
    color: "#F8E7D0",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  passwordSection: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  passwordHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  passwordHeaderText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "800" as const,
  },
});
