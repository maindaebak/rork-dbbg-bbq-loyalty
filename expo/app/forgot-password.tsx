import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import { CheckCircle2, KeyRound, Lock, MessageSquareMore, Phone } from "lucide-react-native";
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
import { signUpWithPhone, verifyPhoneOtp } from "@/lib/api";
import { useMembersStore } from "@/providers/members-store-provider";

type ForgotStep = "phone" | "verify" | "reset" | "done";

export default function ForgotPasswordScreen() {
  const { findMemberByPhone, updateMemberPassword } = useMembersStore();
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [code, setCode] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [step, setStep] = useState<ForgotStep>("phone");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const fullPhone = useMemo(() => {
    const digits = phoneNumber.replace(/[^\d]/g, "");
    return `${countryCode.dial}${digits}`;
  }, [countryCode.dial, phoneNumber]);

  const canSendCode = useMemo<boolean>(
    () => phoneNumber.replace(/[^\d]/g, "").length >= 7,
    [phoneNumber],
  );

  const canVerify = useMemo<boolean>(() => code.trim().length === 6, [code]);

  const passwordError = useMemo<string>(() => {
    if (newPassword.length > 0 && newPassword.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
      return "Passwords do not match";
    }
    return "";
  }, [newPassword, confirmPassword]);

  const canReset = useMemo<boolean>(
    () => newPassword.length >= 6 && newPassword === confirmPassword,
    [newPassword, confirmPassword],
  );

  const handleSendCode = useCallback(async () => {
    if (!canSendCode) {
      Alert.alert("Missing info", "Please enter your phone number.");
      return;
    }

    const existingMember = findMemberByPhone(fullPhone);
    if (!existingMember) {
      Alert.alert("Account not found", "No account found with this phone number. Please check or sign up.");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);

    try {
      console.log("[ForgotPassword] Sending OTP to:", fullPhone);
      const result = await signUpWithPhone(fullPhone);
      console.log("[ForgotPassword] OTP result:", JSON.stringify(result));

      if (!result.success) {
        throw new Error(result.error ?? "Failed to send verification code.");
      }

      setStep("verify");
      Alert.alert("Code sent", "We texted a 6-digit verification code to your phone.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[ForgotPassword] Send OTP error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to send code", msg);
    } finally {
      setIsSending(false);
    }
  }, [canSendCode, fullPhone, findMemberByPhone]);

  const handleVerify = useCallback(async () => {
    if (!canVerify) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsVerifying(true);

    try {
      console.log("[ForgotPassword] Verifying OTP for:", fullPhone);
      const result = await verifyPhoneOtp(fullPhone, code);
      console.log("[ForgotPassword] Verify result:", JSON.stringify(result));

      if (!result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Verification failed", result.error ?? "The code you entered is incorrect. Please try again.");
        return;
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("reset");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[ForgotPassword] Verify error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Verification failed", msg);
    } finally {
      setIsVerifying(false);
    }
  }, [canVerify, code, fullPhone]);

  const handleResetPassword = useCallback(async () => {
    if (!canReset) {
      Alert.alert("Invalid password", "Password must be at least 6 characters and both fields must match.");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsResetting(true);

    try {
      console.log("[ForgotPassword] Resetting password for:", fullPhone);
      const result = await updateMemberPassword(fullPhone, newPassword);

      if (!result.success) {
        throw new Error(result.error ?? "Failed to reset password.");
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("done");
      Alert.alert(
        "Password reset",
        "Your password has been updated successfully. You can now log in with your new password.",
        [{ text: "Go to Login", onPress: () => router.replace("/member-login") }],
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[ForgotPassword] Reset error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Reset failed", msg);
    } finally {
      setIsResetting(false);
    }
  }, [canReset, fullPhone, newPassword, updateMemberPassword]);

  return (
    <>
      <Stack.Screen options={{ title: "Forgot Password", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Account recovery"
        subtitle={
          step === "phone"
            ? "Enter your phone number and we'll send you a verification code to reset your password."
            : step === "verify"
              ? "Enter the 6-digit code we sent to your phone."
              : step === "reset"
                ? "Verified! Now create a new password for your account."
                : "Your password has been reset successfully."
        }
        title="Reset your password."
        heroRight={
          <View style={styles.statusPill} testID="forgot-status">
            <KeyRound color="#F7C58B" size={18} />
            <Text style={styles.statusText}>
              {step === "done" ? "Complete" : "Recovery"}
            </Text>
          </View>
        }
      >
        {step === "phone" && (
          <Panel testID="forgot-phone-panel">
            <SectionTitle
              copy="We'll text you a verification code to confirm your identity."
              title="Verify your phone"
            />
            <PhoneInput
              countryCode={countryCode}
              onCountryCodeChange={setCountryCode}
              phoneNumber={phoneNumber}
              onPhoneNumberChange={setPhoneNumber}
              testID="forgot-phone-input"
            />
            <ActionButton
              icon={MessageSquareMore}
              label={isSending ? "Sending code..." : "Send verification code"}
              onPress={handleSendCode}
              testID="forgot-send-code-button"
              variant="secondary"
            />
          </Panel>
        )}

        {step === "verify" && (
          <Panel testID="forgot-verify-panel">
            <SectionTitle
              copy="Enter the 6-digit code we sent to your phone number."
              title="Enter verification code"
            />
            <View style={styles.phoneDisplay}>
              <Phone color="#F7C58B" size={16} />
              <Text style={styles.phoneDisplayText}>{fullPhone}</Text>
            </View>
            <InputField
              label="Verification code"
              keyboardType="numeric"
              onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit code"
              testID="forgot-code-input"
              value={code}
            />
            <ActionButton
              icon={CheckCircle2}
              label={isVerifying ? "Verifying..." : "Verify code"}
              onPress={handleVerify}
              testID="forgot-verify-button"
              variant="primary"
            />
            <ActionButton
              icon={MessageSquareMore}
              label="Resend code"
              onPress={handleSendCode}
              testID="forgot-resend-button"
              variant="ghost"
            />
          </Panel>
        )}

        {step === "reset" && (
          <Panel testID="forgot-reset-panel">
            <SectionTitle
              copy="Create a new password for your account. You may re-use your old password."
              title="Set new password"
            />
            <View style={styles.verifiedBadge}>
              <CheckCircle2 color="#4CAF50" size={16} />
              <Text style={styles.verifiedText}>Phone verified</Text>
            </View>
            <InputField
              label="New password"
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              testID="forgot-new-password-input"
              value={newPassword}
            />
            <InputField
              label="Confirm new password"
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your new password"
              secureTextEntry
              testID="forgot-confirm-password-input"
              value={confirmPassword}
            />
            {passwordError ? (
              <Text style={styles.passwordError}>{passwordError}</Text>
            ) : null}
            <ActionButton
              icon={Lock}
              label={isResetting ? "Resetting..." : "Reset Password"}
              onPress={handleResetPassword}
              testID="forgot-reset-button"
              variant="primary"
            />
          </Panel>
        )}

        {step === "done" && (
          <Panel testID="forgot-done-panel">
            <View style={styles.successContainer}>
              <CheckCircle2 color="#4CAF50" size={40} />
              <Text style={styles.successTitle}>Password reset!</Text>
              <Text style={styles.successText}>
                Your password has been updated. You can now log in with your new password.
              </Text>
            </View>
            <ActionButton
              icon={KeyRound}
              label="Go to Login"
              onPress={() => router.replace("/member-login")}
              testID="forgot-go-login-button"
              variant="primary"
            />
          </Panel>
        )}
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
  phoneDisplay: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  phoneDisplayText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  verifiedBadge: {
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderColor: "rgba(76, 175, 80, 0.25)",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  verifiedText: {
    color: "#81C784",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  passwordError: {
    color: "#E57373",
    fontSize: 13,
    marginTop: -4,
  },
  successContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  successTitle: {
    color: "#FFF7ED",
    fontSize: 22,
    fontWeight: "800" as const,
  },
  successText: {
    color: "#C8AA94",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center" as const,
  },
});
