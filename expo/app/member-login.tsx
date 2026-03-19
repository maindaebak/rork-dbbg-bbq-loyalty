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
  if (!value.startsWith("+")) {
    value = "+" + value;
  }
  const cleaned = "+" + value.replace(/[^\d]/g, "").slice(0, 15);
  return cleaned;
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
    () => phone.replace(/[^\d]/g, "").length >= 11,
    [phone],
  );

  const canVerify = useMemo<boolean>(() => code.trim().length === 6, [code]);

  const handleSendCode = useCallback(async () => {
    if (!canSendCode) {
      Alert.alert("Phone required", "Enter your phone number with country code (e.g. +1 for US).");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const e164 = phone.startsWith("+") ? phone : "+" + phone.replace(/[^\d]/g, "");
      console.log("[Login] Sending SMS to:", e164);
      await sendSmsMutation.mutateAsync({ phone: e164 });
      console.log("[Login] SMS sent successfully");
      setStep("code-sent");
      Alert.alert("Code sent", "We texted a 6-digit verification code to your phone.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Login] Send SMS error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to send code", msg);
    }
  }, [canSendCode, phone, sendSmsMutation]);

  const handleVerify = useCallback(async () => {
    if (!canVerify) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }

    try {
      const e164 = phone.startsWith("+") ? phone : "+" + phone.replace(/[^\d]/g, "");
      console.log("[Login] Verifying code for:", e164);
      const result = await verifySmsMutation.mutateAsync({ phone: e164, code });

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

      console.log("[Login] Member logged in:", member.fullName);
      login(member);
      router.replace("/member-dashboard");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[Login] Verify error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Verification failed", msg);
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
            onChangeText={(value) => setPhone(formatPhone(value))}
            placeholder="+1XXXXXXXXXX"
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
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
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
});
