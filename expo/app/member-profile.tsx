import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import {
  CheckCircle2,
  Info,
  MessageSquareMore,
  Phone,
  ShieldAlert,
  Trash2,
  User,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { sendSmsCode, verifySmsCode } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

type DeleteStep = "idle" | "sending" | "code-sent" | "verifying";

export default function MemberProfileScreen() {
  const { member, deleteAccount } = useAuth();

  const [deleteStep, setDeleteStep] = useState<DeleteStep>("idle");
  const [deleteCode, setDeleteCode] = useState<string>("");
  const [isSendingDelete, setIsSendingDelete] = useState<boolean>(false);
  const [isVerifyingDelete, setIsVerifyingDelete] = useState<boolean>(false);

  const handleStartDelete = useCallback(() => {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your rewards data. We'll send a verification code to your phone to confirm.\n\nThis action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: async () => {
            if (!member?.phone) {
              Alert.alert("Error", "No phone number found on your account.");
              return;
            }
            setDeleteStep("sending");
            setIsSendingDelete(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              console.log("[Profile] Sending delete verification SMS to:", member.phone);
              const result = await sendSmsCode(member.phone);
              if (!result.success) {
                throw new Error(result.error ?? "Failed to send verification code.");
              }
              setDeleteStep("code-sent");
              Alert.alert("Code sent", "We texted a 6-digit verification code to your phone. Enter it to confirm account deletion.");
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              console.error("[Profile] Delete SMS error:", msg);
              setDeleteStep("idle");
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Failed to send code", msg);
            } finally {
              setIsSendingDelete(false);
            }
          },
        },
      ],
    );
  }, [member?.phone]);

  const handleVerifyDelete = useCallback(async () => {
    if (deleteCode.trim().length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from your text message.");
      return;
    }
    if (!member?.phone) return;

    setIsVerifyingDelete(true);
    setDeleteStep("verifying");
    try {
      console.log("[Profile] Verifying delete code for:", member.phone);
      const result = await verifySmsCode(member.phone, deleteCode);
      if (!result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Verification failed", "The code you entered is incorrect. Please try again.");
        setDeleteStep("code-sent");
        return;
      }

      console.log("[Profile] Delete verification passed, deleting account");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      deleteAccount();
      router.replace("/");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[Profile] Delete verify error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Verification failed", msg);
      setDeleteStep("code-sent");
    } finally {
      setIsVerifyingDelete(false);
    }
  }, [deleteAccount, deleteCode, member?.phone]);

  return (
    <>
      <Stack.Screen options={{ title: "My profile", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Account settings"
        subtitle="View your profile details or manage your account."
        title="Your member profile."
        heroRight={
          <View style={styles.avatarCircle} testID="profile-avatar">
            <User color="#F7C58B" size={24} />
          </View>
        }
      >
        <Panel testID="profile-info-panel">
          <SectionTitle copy="Your membership details." title="Member Information" />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User color="#F7C58B" size={16} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{member?.fullName || "—"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Phone color="#F7C58B" size={16} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{member?.phone || "—"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <User color="#F7C58B" size={16} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Birthdate</Text>
              <Text style={styles.infoValue}>
                {member?.birthdate ? `${member.birthdate}/${member.birthYear}` : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.contactNote}>
            <Info color="#F59E0B" size={15} />
            <Text style={styles.contactNoteText}>
              To change your phone number or birthday, please contact a staff member for assistance.
            </Text>
          </View>
        </Panel>

        <Panel testID="profile-danger-panel">
          <SectionTitle copy="Permanently remove your account and all data." title="Danger zone" />

          {deleteStep === "idle" && (
            <Pressable
              onPress={handleStartDelete}
              style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
              testID="profile-delete-button"
            >
              <Trash2 color="#EF4444" size={18} />
              <Text style={styles.dangerText}>Delete my account</Text>
              <ShieldAlert color="#EF4444" size={18} />
            </Pressable>
          )}

          {(deleteStep === "sending" || deleteStep === "code-sent" || deleteStep === "verifying") && (
            <View style={styles.deleteVerifySection}>
              <View style={styles.deleteVerifyBanner}>
                <MessageSquareMore color="#F87171" size={16} />
                <Text style={styles.deleteVerifyBannerText}>
                  {isSendingDelete
                    ? "Sending verification code..."
                    : "Enter the 6-digit code sent to your phone to confirm deletion."}
                </Text>
              </View>

              {(deleteStep === "code-sent" || deleteStep === "verifying") && (
                <>
                  <InputField
                    label="Verification code"
                    keyboardType="numeric"
                    onChangeText={(value) => setDeleteCode(value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    testID="profile-delete-code-input"
                    value={deleteCode}
                  />
                  <ActionButton
                    icon={CheckCircle2}
                    label={isVerifyingDelete ? "Verifying..." : "Confirm & delete account"}
                    onPress={handleVerifyDelete}
                    testID="profile-delete-verify-button"
                    variant="primary"
                  />
                  <Pressable
                    onPress={() => {
                      setDeleteStep("idle");
                      setDeleteCode("");
                    }}
                    style={({ pressed }) => [styles.cancelDeleteButton, pressed && { opacity: 0.7 }]}
                    testID="profile-delete-cancel-button"
                  >
                    <Text style={styles.cancelDeleteText}>Cancel</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  avatarCircle: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  contactNote: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  contactNoteText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 17,
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.25)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  dangerText: {
    color: "#EF4444",
    flex: 1,
    fontSize: 15,
    fontWeight: "800" as const,
  },
  deleteVerifySection: {
    gap: 12,
  },
  deleteVerifyBanner: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteVerifyBannerText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  cancelDeleteButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelDeleteText: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  divider: {
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    height: 1,
  },
  infoContent: {
    flex: 1,
    gap: 2,
  },
  infoIcon: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  infoLabel: {
    color: "#C8AA94",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  infoValue: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
