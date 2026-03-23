import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  MessageSquareMore,
  Phone,
  Shield,
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
import { registerForPushNotifications, savePushToken, removePushToken } from "@/lib/push-notifications";
import { useAuth } from "@/providers/auth-provider";
import { useMembersStore } from "@/providers/members-store-provider";

type DeleteStep = "idle" | "sending" | "code-sent" | "verifying";

export default function MemberProfileScreen() {
  const { member, deleteAccount } = useAuth();
  const { findMemberByPhone, updateMemberProfile } = useMembersStore();

  const storedMember = member?.phone ? findMemberByPhone(member.phone) : undefined;
  const isMarketingOptedIn = storedMember?.marketingOptIn ?? false;
  const isPushOptedIn = storedMember?.pushNotificationOptIn ?? true;

  const handleTogglePushNotifications = useCallback(async () => {
    if (!storedMember || !member?.id) return;
    const newValue = !isPushOptedIn;
    updateMemberProfile(storedMember.id, { pushNotificationOptIn: newValue });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newValue) {
      try {
        console.log("[Profile] Re-registering push notifications...");
        const token = await registerForPushNotifications();
        if (token) {
          await savePushToken(member.id, token);
          console.log("[Profile] Push token saved after opt-in");
        }
      } catch (err) {
        console.error("[Profile] Push re-registration error:", err);
      }
      Alert.alert(
        "Push notifications enabled",
        "You'll now receive push notifications about deals, rewards, and updates.",
      );
    } else {
      try {
        console.log("[Profile] Removing push token for member", member.id);
        await removePushToken(member.id);
      } catch (err) {
        console.error("[Profile] Push token removal error:", err);
      }
      Alert.alert(
        "Push notifications disabled",
        "You've opted out of push notifications. You can re-enable anytime.",
      );
    }
    console.log("[Profile] Push notification opt-in toggled to:", newValue);
  }, [isPushOptedIn, storedMember, member?.id, updateMemberProfile]);

  const handleToggleMarketing = useCallback(() => {
    if (!storedMember) return;
    const newValue = !isMarketingOptedIn;
    updateMemberProfile(storedMember.id, { marketingOptIn: newValue });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      newValue ? "Marketing enabled" : "Marketing disabled",
      newValue
        ? "You'll now receive promotional texts about deals, birthday rewards, and points reminders."
        : "You've opted out of promotional text messages. You can re-enable anytime.",
    );
    console.log("[Profile] Marketing opt-in toggled to:", newValue);
  }, [isMarketingOptedIn, storedMember, updateMemberProfile]);

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

        <Panel testID="profile-marketing-panel">
          <SectionTitle copy="Manage your promotional text message preferences." title="Marketing messages" />

          <View style={styles.marketingRow}>
            <View style={styles.marketingIconWrap}>
              {isMarketingOptedIn ? <Bell color="#22C55E" size={18} /> : <BellOff color="#C8AA94" size={18} />}
            </View>
            <View style={styles.marketingContent}>
              <Text style={styles.marketingTitle}>
                {isMarketingOptedIn ? "Promotional texts enabled" : "Promotional texts disabled"}
              </Text>
              <Text style={styles.marketingSubtitle}>
                {isMarketingOptedIn
                  ? "You'll receive deals, birthday rewards, and point reminders."
                  : "You won't receive any promotional text messages."}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleToggleMarketing}
            style={({ pressed }) => [
              isMarketingOptedIn ? styles.marketingOptOutButton : styles.marketingOptInButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
            ]}
            testID="profile-marketing-toggle"
          >
            {isMarketingOptedIn ? <BellOff color="#F87171" size={16} /> : <Bell color="#22C55E" size={16} />}
            <Text style={isMarketingOptedIn ? styles.marketingOptOutText : styles.marketingOptInText}>
              {isMarketingOptedIn ? "Opt out of marketing texts" : "Opt in to marketing texts"}
            </Text>
          </Pressable>
        </Panel>

        <Panel testID="profile-push-panel">
          <SectionTitle copy="Manage your push notification preferences." title="Push notifications" />

          <View style={styles.marketingRow}>
            <View style={styles.marketingIconWrap}>
              {isPushOptedIn ? <Bell color="#22C55E" size={18} /> : <BellOff color="#C8AA94" size={18} />}
            </View>
            <View style={styles.marketingContent}>
              <Text style={styles.marketingTitle}>
                {isPushOptedIn ? "Push notifications enabled" : "Push notifications disabled"}
              </Text>
              <Text style={styles.marketingSubtitle}>
                {isPushOptedIn
                  ? "You'll receive push notifications about deals, rewards, and updates."
                  : "You won't receive any push notifications."}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleTogglePushNotifications}
            style={({ pressed }) => [
              isPushOptedIn ? styles.marketingOptOutButton : styles.marketingOptInButton,
              pressed && { opacity: 0.8, transform: [{ scale: 0.985 }] },
            ]}
            testID="profile-push-toggle"
          >
            {isPushOptedIn ? <BellOff color="#F87171" size={16} /> : <Bell color="#22C55E" size={16} />}
            <Text style={isPushOptedIn ? styles.marketingOptOutText : styles.marketingOptInText}>
              {isPushOptedIn ? "Opt out of push notifications" : "Opt in to push notifications"}
            </Text>
          </Pressable>
        </Panel>

        <Panel testID="profile-legal-panel">
          <SectionTitle copy="Review our legal documents anytime." title="Legal" />

          <Pressable
            onPress={() => router.push("/terms-conditions")}
            style={({ pressed }) => [styles.legalRow, pressed && { opacity: 0.7 }]}
            testID="profile-terms-link"
          >
            <View style={styles.legalIconWrap}>
              <FileText color="#F7C58B" size={16} />
            </View>
            <Text style={styles.legalText}>Terms & Conditions</Text>
            <ChevronRight color="#C8AA94" size={18} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            onPress={() => router.push("/privacy-policy")}
            style={({ pressed }) => [styles.legalRow, pressed && { opacity: 0.7 }]}
            testID="profile-privacy-link"
          >
            <View style={styles.legalIconWrap}>
              <Shield color="#F7C58B" size={16} />
            </View>
            <Text style={styles.legalText}>Privacy Policy</Text>
            <ChevronRight color="#C8AA94" size={18} />
          </Pressable>
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
  marketingContent: {
    flex: 1,
    gap: 3,
  },
  marketingIconWrap: {
    alignItems: "center" as const,
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center" as const,
    width: 40,
  },
  marketingOptInButton: {
    alignItems: "center" as const,
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.25)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 10,
    justifyContent: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  marketingOptInText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  marketingOptOutButton: {
    alignItems: "center" as const,
    backgroundColor: "rgba(248, 113, 113, 0.06)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 10,
    justifyContent: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  marketingOptOutText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  marketingRow: {
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 14,
    padding: 14,
  },
  marketingSubtitle: {
    color: "#C8AA94",
    fontSize: 12,
    lineHeight: 17,
  },
  marketingTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  legalIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  legalRow: {
    alignItems: "center",
    flexDirection: "row" as const,
    gap: 12,
    paddingVertical: 4,
  },
  legalText: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
