import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import { CheckCircle2, LogIn, MessageSquareMore, Phone } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { trpc } from "@/lib/trpc";
import { useAuth, type MemberProfile } from "@/providers/auth-provider";
import { useMembersStore } from "@/providers/members-store-provider";

type LoginStep = "phone" | "code-sent" | "verified";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function MemberLoginScreen() {
  const { login } = useAuth();
  const { findMemberByPhone } = useMembersStore();
  const [phone, setPhone] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [step, setStep] = useState<LoginStep>("phone");

  const sendSmsMutation = trpc.verification.sendSmsCode.useMutation();
  const verifySmsMutation = trpc.verification.verifySmsCode.useMutation();

  const canSendCode = useMemo<boolean>(
    () => phone.replace(/\D/g, "").length === 10,
    [phone],
  );

  const canVerify = useMemo<boolean>(() => code.trim().length === 6, [code]);

  const handleSendCode = useCallback(async () => {
    console.log("[Login] Requesting verification code for", phone);
    if (!canSendCode) {
      Alert.alert("Phone required", "Enter your 10-digit phone number to receive a verification code.");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const rawDigits = phone.replace(/\D/g, "");
      console.log("[Login] Sending SMS to digits:", rawDigits, "formatted:", phone);
      await sendSmsMutation.mutateAsync({ phone: rawDigits });
      console.log("[Login] SMS verification sent successfully");
      setStep("code-sent");
      Alert.alert("Code sent", "We texted a 6-digit verification code to your phone.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log("[Login] SMS send error:", msg);
      console.log("[Login] tRPC URL:", process.env.EXPO_PUBLIC_RORK_API_BASE_URL);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const isUrlError = msg.includes("string") && msg.includes("pattern");
      Alert.alert(
        "Failed to send code",
        isUrlError
          ? "Unable to connect to the server. Please check your internet connection and try again."
          : msg,
      );
    }
  }, [canSendCode, phone, sendSmsMutation]);

  const handleVerify = useCallback(async () => {
    console.log("[Login] Verifying code", code);
    if (!canVerify) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }

    try {
      const rawDigits = phone.replace(/\D/g, "");
      console.log("[Login] Verifying code for digits:", rawDigits);
      const result = await verifySmsMutation.mutateAsync({ phone: rawDigits, code });

      if (!result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Verification failed", "The code you entered is incorrect. Please try again.");
        return;
      }

      setStep("verified");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const existingMember = findMemberByPhone(phone);
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
            phone,
            birthdate: "",
            birthYear: "",
            createdAt: new Date().toISOString(),
          };

      console.log("[Login] Member logged in with phone", phone);
      login(member);
      router.replace("/member-dashboard");
    } catch (error) {
      console.log("[Login] Verification error:", error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Verification failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }, [canVerify, code, findMemberByPhone, login, phone, verifySmsMutation]);

  return (
    <>
      <Stack.Screen options={{ title: "Log in", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Welcome back"
        subtitle="Log in with your phone number. We'll send a text message to verify it's you."
        title="Log in to your rewards."
        heroRight={
          <View style={styles.statusPill} testID="login-status">
            <Phone color="#F7C58B" size={18} />
            <Text style={styles.statusText}>
              {step === "verified" ? "Verified" : "Member"}
            </Text>
          </View>
        }
      >
        <Panel testID="login-phone-panel">
          <SectionTitle
            copy="Enter the phone number linked to your account."
            title="Your phone number"
          />
          <InputField
            label="Phone number"
            keyboardType="phone-pad"
            onChangeText={(value) => {
              console.log("[Login] Updating phone");
              setPhone(formatPhone(value));
            }}
            placeholder="555-123-4567"
            testID="login-phone-input"
            value={phone}
          />
          <ActionButton
            icon={MessageSquareMore}
            label={
              sendSmsMutation.isPending
                ? "Sending code..."
                : step === "code-sent"
                  ? "Resend verification code"
                  : "Send verification code"
            }
            onPress={handleSendCode}
            testID="login-send-code-button"
            variant="secondary"
          />
        </Panel>

        {(step === "code-sent" || step === "verified") && (
          <Panel testID="login-code-panel">
            <SectionTitle
              copy="Enter the 6-digit code we texted to your phone."
              title="Verification code"
            />
            <InputField
              label="6-digit code"
              keyboardType="numeric"
              onChangeText={(value) => {
                console.log("[Login] Updating code");
                setCode(value.replace(/\D/g, "").slice(0, 6));
              }}
              placeholder="Enter 6-digit code"
              testID="login-code-input"
              value={code}
            />
            <ActionButton
              icon={CheckCircle2}
              label={verifySmsMutation.isPending ? "Verifying..." : "Verify & log in"}
              onPress={handleVerify}
              testID="login-verify-button"
              variant="primary"
            />
          </Panel>
        )}

        <Panel testID="login-signup-redirect-panel">
          <SectionTitle
            copy="Don't have a rewards account yet?"
            title="New here?"
          />
          <ActionButton
            icon={LogIn}
            label="Sign up instead"
            onPress={() => {
              console.log("[Login] Redirecting to signup");
              router.replace("/member-signup");
            }}
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
});
