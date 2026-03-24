import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import { KeyRound, LogIn, Phone, UserPlus } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { PhoneInput, DEFAULT_COUNTRY_CODE, type CountryCode } from "@/components/loyalty/phone-input";
import { useAuth, type MemberProfile } from "@/providers/auth-provider";
import { useMembersStore } from "@/providers/members-store-provider";

export default function MemberLoginScreen() {
  const { login } = useAuth();
  const { loginWithPassword } = useMembersStore();
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
      console.log("[Login] Attempting password login for:", phoneToSend);
      const result = await loginWithPassword(phoneToSend, password);

      if (!result.success || !result.member) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Login failed", result.error ?? "Invalid phone number or password.");
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const storedMember = result.member;
      const member: MemberProfile = {
        id: storedMember.id,
        fullName: storedMember.fullName,
        phone: storedMember.phone,
        birthdate: storedMember.birthdate,
        birthYear: storedMember.birthYear,
        createdAt: storedMember.createdAt,
        marketingOptIn: storedMember.marketingOptIn ?? false,
        pushNotificationOptIn: storedMember.pushNotificationOptIn ?? true,
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
  }, [canLogin, fullPhone, password, login, loginWithPassword]);

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

          <InputField
            label="Password"
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            testID="login-password-input"
            value={password}
          />

          <ActionButton
            icon={LogIn}
            label={isLoggingIn ? "Logging in..." : "Log in"}
            onPress={handleLogin}
            testID="login-submit-button"
            variant="primary"
          />

          <Pressable
            onPress={() => router.push("/forgot-password" as never)}
            style={({ pressed }) => [styles.forgotButton, pressed && { opacity: 0.7 }]}
            testID="login-forgot-password-button"
          >
            <KeyRound color="#F7C58B" size={16} />
            <Text style={styles.forgotButtonText}>Forgot Password?</Text>
          </Pressable>
        </Panel>

        <Panel testID="login-signup-redirect-panel">
          <SectionTitle
            copy="Don't have a rewards account yet?"
            title="New here?"
          />
          <ActionButton
            icon={UserPlus}
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
  forgotButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 8,
  },
  forgotButtonText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "700" as const,
  },
});
