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
import { useAuth, type MemberProfile } from "@/providers/auth-provider";
import { useMembersStore } from "@/providers/members-store-provider";

interface SignupFormState {
  fullName: string;
  phone: string;
  email: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  code: string;
  agreedToTerms: boolean;
}

type VerificationStatus = "idle" | "sending" | "sent" | "verified";

const INITIAL_FORM: SignupFormState = {
  fullName: "",
  phone: "",
  email: "",
  birthMonth: "",
  birthDay: "",
  birthYear: "",
  code: "",
  agreedToTerms: false,
};

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

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
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");

  const updateField = useCallback((key: keyof SignupFormState, value: string) => {
    console.log("[Signup] Updating field", key);
    setForm((current) => ({
      ...current,
      [key]: key === "phone" ? formatPhone(value) : value,
    }));
  }, []);

  const canSendCode = useMemo<boolean>(() => {
    return Boolean(
      form.fullName.trim().length >= 2 &&
        form.phone.replace(/\D/g, "").length === 10 &&
        isValidEmail(form.email) &&
        isValidBirthMonth(form.birthMonth) &&
        isValidBirthDay(form.birthDay) &&
        isValidBirthYear(form.birthYear) &&
        form.agreedToTerms,
    );
  }, [form.birthYear, form.birthMonth, form.birthDay, form.email, form.fullName, form.phone, form.agreedToTerms]);

  const canVerify = useMemo<boolean>(() => form.code.trim().length === 6, [form.code]);

  const handleSendCode = useCallback(() => {
    console.log("[Signup] Sending verification code to", form.phone);
    if (!form.agreedToTerms) {
      Alert.alert(
        "Terms & Conditions",
        "You must agree to the Terms & Conditions before signing up.",
      );
      return;
    }
    if (!canSendCode) {
      Alert.alert(
        "Missing info",
        "Please fill in all fields before requesting a verification code.",
      );
      return;
    }
    setVerificationStatus("sending");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      console.log("[Signup] SMS verification sent");
      setVerificationStatus("sent");
      Alert.alert("Code sent", "We texted a 6-digit verification code to your phone.");
    }, 900);
  }, [canSendCode, form.phone, form.agreedToTerms]);

  const handleVerify = useCallback(() => {
    console.log("[Signup] Verifying code", form.code);
    if (!canVerify) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }
    if (form.code !== "246810") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Code not recognized", "Use demo code 246810 to complete this prototype.");
      return;
    }

    setVerificationStatus("verified");
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const member: MemberProfile = {
      id: `member-${Date.now()}`,
      fullName: form.fullName.trim(),
      phone: form.phone,
      email: form.email.trim(),
      birthdate: `${form.birthMonth.trim().padStart(2, "0")}/${form.birthDay.trim().padStart(2, "0")}`,
      birthYear: form.birthYear.trim(),
      createdAt: new Date().toISOString(),
      emailVerified: false,
    };

    console.log("[Signup] Creating member account", member.fullName);
    registerMember(member);
    login(member);

    setTimeout(() => {
      Alert.alert(
        "Verify your email",
        `A confirmation email has been sent to ${form.email.trim()}. Please check your inbox and verify your email to start using your points.\n\nYou can still earn points, but you won't be able to redeem them until your email is verified.`,
      );
    }, 500);

    router.replace("/member-dashboard");
  }, [canVerify, form, login, registerMember]);

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
          <InputField
            label="Phone number"
            keyboardType="phone-pad"
            onChangeText={(value) => updateField("phone", value)}
            placeholder="555-123-4567"
            testID="signup-phone-input"
            value={form.phone}
          />
          <InputField
            label="Email"
            keyboardType="email-address"
            onChangeText={(value) => updateField("email", value)}
            placeholder="name@email.com"
            testID="signup-email-input"
            value={form.email}
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
                onPress={() => {
                  console.log("[Signup] Opening terms");
                  router.push("/terms-conditions");
                }}
                style={styles.termsLink}
              >
                Terms & Conditions
              </Text>
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              console.log("[Signup] Opening terms page");
              router.push("/terms-conditions");
            }}
            style={({ pressed }) => [styles.viewTermsButton, pressed && { opacity: 0.7 }]}
            testID="signup-view-terms-button"
          >
            <FileText color="#F7C58B" size={16} />
            <Text style={styles.viewTermsText}>Read full Terms & Conditions</Text>
          </Pressable>

          <ActionButton
            icon={MessageSquareMore}
            label={verificationStatus === "sending" ? "Sending code..." : "Send text verification"}
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
                placeholder="246810"
                testID="signup-code-input"
                value={form.code}
              />
              <ActionButton
                icon={CheckCircle2}
                label="Complete sign up"
                onPress={handleVerify}
                testID="signup-complete-button"
                variant="primary"
              />
            </>
          )}
          <Text style={styles.helperText}>Demo verification code: 246810</Text>
        </Panel>

        <Panel testID="signup-login-redirect-panel">
          <SectionTitle
            copy="Already have a rewards account?"
            title="Returning member?"
          />
          <ActionButton
            icon={UserPlus}
            label="Log in instead"
            onPress={() => {
              console.log("[Signup] Redirecting to login");
              router.replace("/member-login");
            }}
            testID="signup-go-login-button"
            variant="secondary"
          />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
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
  helperText: {
    color: "#C8AA94",
    fontSize: 13,
    lineHeight: 18,
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
  birthdateNote: {
    color: "#C8AA94",
    fontSize: 12,
    fontStyle: "italic" as const,
    lineHeight: 17,
    marginTop: -2,
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
