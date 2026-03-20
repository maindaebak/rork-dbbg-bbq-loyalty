import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import { CheckCircle2, FileText, MessageSquareMore, Sparkles, UserPlus } from "lucide-react-native";
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
import { sendSmsCode, verifySmsCode } from "@/lib/api";
import { useAuth, type MemberProfile } from "@/providers/auth-provider";
import { useMembersStore } from "@/providers/members-store-provider";

interface SignupFormState {
  fullName: string;
  phoneNumber: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  code: string;
  agreedToTerms: boolean;
}

type VerificationStatus = "idle" | "sending" | "sent" | "verified";

const INITIAL_FORM: SignupFormState = {
  fullName: "",
  phoneNumber: "",
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  code: "",
  agreedToTerms: false,
};

function isValidBirthMonth(value: string): boolean {
  const num = Number(value);
  return value.trim().length > 0 && num >= 1 && num <= 12;
}

function isValidBirthDay(value: string): boolean {
  const num = Number(value);
  return value.trim().length > 0 && num >= 1 && num <= 31;
}

function isValidBirthYear(value: string): boolean {
  const year = Number(value);
  return Number.isInteger(year) && year >= 1900 && year <= 2026;
}

export default function MemberSignupScreen() {
  const { login } = useAuth();
  const { registerMember } = useMembersStore();
  const [form, setForm] = useState<SignupFormState>(INITIAL_FORM);
  const [countryCode, setCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");

  const [isSending, setIsSending] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const updateField = useCallback((key: keyof SignupFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }, []);

  const fullPhone = useMemo(() => {
    const digits = form.phoneNumber.replace(/[^\d]/g, "");
    return `${countryCode.dial}${digits}`;
  }, [countryCode.dial, form.phoneNumber]);

  const canSendCode = useMemo<boolean>(() => {
    const phoneDigits = form.phoneNumber.replace(/[^\d]/g, "");
    return Boolean(
      form.fullName.trim().length >= 2 &&
        phoneDigits.length >= 7 &&
        isValidBirthMonth(form.birthMonth) &&
        isValidBirthDay(form.birthDay) &&
        isValidBirthYear(form.birthYear) &&
        form.agreedToTerms,
    );
  }, [form.birthYear, form.birthMonth, form.birthDay, form.fullName, form.phoneNumber, form.agreedToTerms]);

  const canVerify = useMemo<boolean>(() => form.code.trim().length === 6, [form.code]);

  const handleSendCode = useCallback(async () => {
    if (!form.agreedToTerms) {
      Alert.alert("Terms & Conditions", "You must agree to the Terms & Conditions before signing up.");
      return;
    }
    if (!canSendCode) {
      Alert.alert("Missing info", "Please fill in all fields before requesting a verification code.");
      return;
    }

    setVerificationStatus("sending");
    setIsSending(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const phoneToSend = fullPhone;
      console.log("[Signup] Sending SMS to:", phoneToSend);
      const result = await sendSmsCode(phoneToSend);
      console.log("[Signup] SMS result:", JSON.stringify(result));

      if (!result.success) {
        throw new Error(result.error ?? "Failed to send verification code.");
      }

      setVerificationStatus("sent");
      Alert.alert("Code sent", "We texted a 6-digit verification code to your phone.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[Signup] Send SMS error:", msg);
      setVerificationStatus("idle");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to send code", msg);
    } finally {
      setIsSending(false);
    }
  }, [canSendCode, fullPhone, form.agreedToTerms]);

  const handleVerify = useCallback(async () => {
    if (!canVerify) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }

    setIsVerifying(true);
    try {
      const phoneToSend = fullPhone;
      console.log("[Signup] Verifying code for:", phoneToSend);
      const result = await verifySmsCode(phoneToSend, form.code);
      console.log("[Signup] Verify result:", JSON.stringify(result));

      if (!result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Verification failed", "The code you entered is incorrect. Please try again.");
        return;
      }

      setVerificationStatus("verified");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const member: MemberProfile = {
        id: `member-${Date.now()}`,
        fullName: form.fullName.trim(),
        phone: fullPhone,
        birthdate: `${form.birthMonth.trim().padStart(2, "0")}/${form.birthDay.trim().padStart(2, "0")}`,
        birthYear: form.birthYear.trim(),
        createdAt: new Date().toISOString(),
      };

      console.log("[Signup] Creating member:", member.fullName);
      registerMember(member);
      login(member);
      router.replace("/member-dashboard");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[Signup] Verify error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Verification failed", msg);
    } finally {
      setIsVerifying(false);
    }
  }, [canVerify, form, fullPhone, login, registerMember]);

  return (
    <>
      <Stack.Screen options={{ title: "Sign up", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="New member"
        subtitle="Create your rewards account. We'll verify your phone number with a text message."
        title="Join the Dae Bak family."
        heroRight={
          <View style={styles.statusPill} testID="signup-status">
            <Sparkles color="#F7C58B" size={18} />
            <Text style={styles.statusText}>
              {verificationStatus === "verified" ? "Verified" : "New member"}
            </Text>
          </View>
        }
      >
        <Panel testID="signup-form-panel">
          <SectionTitle
            copy="Fill in your details and verify your phone number to get started."
            title="Create your account"
          />
          <InputField
            label="Full name"
            onChangeText={(value) => updateField("fullName", value)}
            placeholder="Jisoo Kim"
            testID="signup-name-input"
            value={form.fullName}
          />
          <PhoneInput
            countryCode={countryCode}
            onCountryCodeChange={setCountryCode}
            phoneNumber={form.phoneNumber}
            onPhoneNumberChange={(value) => updateField("phoneNumber", value)}
            testID="signup-phone-input"
          />
          <View style={styles.row}>
            <View style={styles.rowItemSmall}>
              <InputField
                label="Month"
                keyboardType="numeric"
                onChangeText={(value) => updateField("birthMonth", value.replace(/\D/g, "").slice(0, 2))}
                placeholder="MM"
                testID="signup-birthmonth-input"
                value={form.birthMonth}
              />
            </View>
            <View style={styles.rowItemSmall}>
              <InputField
                label="Day"
                keyboardType="numeric"
                onChangeText={(value) => updateField("birthDay", value.replace(/\D/g, "").slice(0, 2))}
                placeholder="DD"
                testID="signup-birthday-input"
                value={form.birthDay}
              />
            </View>
            <View style={styles.rowItem}>
              <InputField
                label="Birth year"
                keyboardType="numeric"
                onChangeText={(value) => updateField("birthYear", value.replace(/\D/g, "").slice(0, 4))}
                placeholder="1998"
                testID="signup-birthyear-input"
                value={form.birthYear}
              />
            </View>
          </View>
          <Text style={styles.birthdateNote}>
            Please use your real name and birthdate that is listed on your government issued ID for security and identification verification purposes.
          </Text>

          <Pressable
            onPress={() => setForm((prev) => ({ ...prev, agreedToTerms: !prev.agreedToTerms }))}
            style={styles.termsRow}
            testID="signup-terms-checkbox"
          >
            <View style={[styles.checkbox, form.agreedToTerms && styles.checkboxChecked]}>
              {form.agreedToTerms && <CheckCircle2 color="#1A120E" size={14} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text
                onPress={() => router.push("/terms-conditions")}
                style={styles.termsLink}
              >
                Terms & Conditions
              </Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/terms-conditions")}
            style={({ pressed }) => [styles.viewTermsButton, pressed && { opacity: 0.7 }]}
            testID="signup-view-terms-button"
          >
            <FileText color="#F7C58B" size={16} />
            <Text style={styles.viewTermsText}>Read full Terms & Conditions</Text>
          </Pressable>

          <ActionButton
            icon={MessageSquareMore}
            label={
              isSending
                ? "Sending code..."
                : verificationStatus === "sent"
                  ? "Resend verification code"
                  : "Send text verification"
            }
            onPress={handleSendCode}
            testID="signup-send-code-button"
            variant="secondary"
          />

          {(verificationStatus === "sent" || verificationStatus === "verified") && (
            <>
              <InputField
                label="Verification code"
                keyboardType="numeric"
                onChangeText={(value) => updateField("code", value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit code"
                testID="signup-code-input"
                value={form.code}
              />
              <ActionButton
                icon={CheckCircle2}
                label={isVerifying ? "Verifying..." : "Complete sign up"}
                onPress={handleVerify}
                testID="signup-complete-button"
                variant="primary"
              />
            </>
          )}
        </Panel>

        <Panel testID="signup-login-redirect-panel">
          <SectionTitle
            copy="Already have a rewards account?"
            title="Returning member?"
          />
          <ActionButton
            icon={UserPlus}
            label="Log in instead"
            onPress={() => router.replace("/member-login")}
            testID="signup-go-login-button"
            variant="secondary"
          />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  birthdateNote: {
    color: "#C8AA94",
    fontSize: 12,
    fontStyle: "italic" as const,
    lineHeight: 17,
    marginTop: -2,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 6,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  checkboxChecked: {
    backgroundColor: "#F7C58B",
    borderColor: "#F7C58B",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  rowItemSmall: {
    flex: 0.6,
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
  termsLink: {
    color: "#F7C58B",
    fontWeight: "700" as const,
    textDecorationLine: "underline" as const,
  },
  termsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 4,
  },
  termsText: {
    color: "#E7CDB8",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  viewTermsButton: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewTermsText: {
    color: "#F7C58B",
    fontSize: 13,
    fontWeight: "700" as const,
  },

});
