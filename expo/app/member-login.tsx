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
  const [isSending, setIsSending] = useState<boolean>(false);

  const canSendCode = useMemo<boolean>(
    () => phone.replace(/\D/g, "").length === 10,
    [phone],
  );

  const canVerify = useMemo<boolean>(() => code.trim().length === 6, [code]);

  const handleSendCode = useCallback(() => {
    console.log("[Login] Requesting verification code for", phone);
    if (!canSendCode) {
      Alert.alert("Phone required", "Enter your 10-digit phone number to receive a verification code.");
      return;
    }

    setIsSending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setTimeout(() => {
      console.log("[Login] SMS verification sent");
      setIsSending(false);
      setStep("code-sent");
      Alert.alert("Code sent", "We texted a 6-digit verification code to your phone.");
    }, 900);
  }, [canSendCode, phone]);

  const handleVerify = useCallback(() => {
    console.log("[Login] Verifying code", code);
    if (!canVerify) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }
    if (code !== "246810") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Code not recognized", "Use demo code 246810 to complete this prototype.");
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
          email: existingMember.email,
          birthdate: existingMember.birthdate,
          birthYear: existingMember.birthYear,
          createdAt: existingMember.createdAt,
          emailVerified: existingMember.emailVerified ?? false,
        }
      : {
          id: `member-${Date.now()}`,
          fullName: "Returning Member",
          phone,
          email: "",
          birthdate: "",
          birthYear: "",
          createdAt: new Date().toISOString(),
          emailVerified: false,
        };

    console.log("[Login] Member logged in with phone", phone);
    login(member);
    router.replace("/member-dashboard");
  }, [canVerify, code, findMemberByPhone, login, phone]);

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
            label={isSending ? "Sending code..." : "Send verification code"}
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
              placeholder="246810"
              testID="login-code-input"
              value={code}
            />
            <ActionButton
              icon={CheckCircle2}
              label="Verify & log in"
              onPress={handleVerify}
              testID="login-verify-button"
              variant="primary"
            />
            <Text style={styles.helperText}>Demo verification code: 246810</Text>
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
  helperText: {
    color: "#C8AA94",
    fontSize: 13,
    lineHeight: 18,
  },
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
