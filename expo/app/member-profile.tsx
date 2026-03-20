import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import {
  ChevronRight,
  Info,
  LogOut,
  Phone,
  Save,
  ShieldAlert,
  Trash2,
  User,
  X,
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
import { useAuth } from "@/providers/auth-provider";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function MemberProfileScreen() {
  const { member, updateProfile, logout, deleteAccount } = useAuth();

  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);
  const [editPhone, setEditPhone] = useState<string>(member?.phone ?? "");

  const handleSavePhone = useCallback(() => {
    const digits = editPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit phone number.");
      return;
    }
    console.log("[Profile] Saving new phone", editPhone);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateProfile({ phone: editPhone });
    setIsEditingPhone(false);
    Alert.alert("Updated", "Your phone number has been updated.");
  }, [editPhone, updateProfile]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      "Log out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log out",
          style: "destructive",
          onPress: () => {
            console.log("[Profile] Logging out");
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            logout();
            router.replace("/");
          },
        },
      ],
    );
  }, [logout]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete account",
      "This will permanently delete your account and all your rewards data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("[Profile] Deleting account");
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            deleteAccount();
            router.replace("/");
          },
        },
      ],
    );
  }, [deleteAccount]);

  return (
    <>
      <Stack.Screen options={{ title: "My profile", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Account settings"
        subtitle="Manage your profile, update contact info, or sign out."
        title="Your member profile."
        heroRight={
          <View style={styles.avatarCircle} testID="profile-avatar">
            <User color="#F7C58B" size={24} />
          </View>
        }
      >
        <Panel testID="profile-info-panel">
          <SectionTitle copy="Your membership details." title="Member info" />

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

          <View style={styles.birthdayNote}>
            <Info color="#F59E0B" size={15} />
            <Text style={styles.birthdayNoteText}>
              Birthday can only be changed by staff upon presenting a valid government-issued ID.
            </Text>
          </View>
        </Panel>

        <Panel testID="profile-edit-phone-panel">
          <SectionTitle copy="Update the phone number linked to your account." title="Change phone number" />
          {isEditingPhone ? (
            <>
              <InputField
                label="New phone number"
                keyboardType="phone-pad"
                onChangeText={(value) => setEditPhone(formatPhone(value))}
                placeholder="555-123-4567"
                testID="profile-phone-input"
                value={editPhone}
              />
              <View style={styles.editActions}>
                <Pressable
                  onPress={() => {
                    setIsEditingPhone(false);
                    setEditPhone(member?.phone ?? "");
                  }}
                  style={styles.cancelButton}
                  testID="profile-phone-cancel"
                >
                  <X color="#C8AA94" size={16} />
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSavePhone}
                  style={styles.saveButton}
                  testID="profile-phone-save"
                >
                  <Save color="#1A120E" size={16} />
                  <Text style={styles.saveText}>Save</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable
              onPress={() => {
                setEditPhone(member?.phone ?? "");
                setIsEditingPhone(true);
              }}
              style={({ pressed }) => [styles.editRow, pressed && styles.pressed]}
              testID="profile-edit-phone-button"
            >
              <Phone color="#F8E7D0" size={16} />
              <Text style={styles.editRowText}>Edit phone number</Text>
              <ChevronRight color="#F8E7D0" size={16} />
            </Pressable>
          )}
        </Panel>

        <Panel testID="profile-actions-panel">
          <SectionTitle copy="Account actions." title="Account" />
          <ActionButton
            icon={LogOut}
            label="Log out"
            onPress={handleLogout}
            testID="profile-logout-button"
            variant="secondary"
          />
        </Panel>

        <Panel testID="profile-danger-panel">
          <SectionTitle copy="Permanently remove your account and all data." title="Danger zone" />
          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
            testID="profile-delete-button"
          >
            <Trash2 color="#EF4444" size={18} />
            <Text style={styles.dangerText}>Delete my account</Text>
            <ShieldAlert color="#EF4444" size={18} />
          </Pressable>
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
  cancelButton: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelText: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "700" as const,
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
  divider: {
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    height: 1,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  editRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  editRowText: {
    color: "#F8E7D0",
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
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
  saveButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveText: {
    color: "#1A120E",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  birthdayNote: {
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
  birthdayNoteText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 17,
  },
});
