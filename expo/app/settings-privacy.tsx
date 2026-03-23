import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Save, Shield } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";

import {
  ActionButton,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

export default function SettingsPrivacyScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [privacyText, setPrivacyText] = useState<string>(settings.privacyPolicy ?? "");

  useEffect(() => {
    setPrivacyText(settings.privacyPolicy ?? "");
  }, [settings.privacyPolicy]);

  const handleSave = useCallback(() => {
    console.log("[SettingsPrivacy] Saving privacy policy");
    updateSettings({ ...settings, privacyPolicy: privacyText });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Privacy policy has been updated.");
  }, [privacyText, settings, updateSettings]);

  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Legal"
        subtitle="Edit the privacy policy that members can view. This explains how you collect, use, and protect their information."
        title="Privacy policy."
        heroRight={<Shield color="#F7C58B" size={28} />}
      >
        <Panel testID="settings-privacy-panel">
          <SectionTitle copy="Edit the privacy policy content below." title="Privacy Policy" />
          <View style={styles.editorWrap}>
            <View style={styles.editorHeader}>
              <Shield color="#F7C58B" size={14} />
              <Text style={styles.editorLabel}>Privacy policy content</Text>
            </View>
            <TextInput
              multiline
              numberOfLines={12}
              onChangeText={setPrivacyText}
              placeholder="Enter your privacy policy here..."
              placeholderTextColor="#8E6D56"
              style={styles.textInput}
              testID="settings-privacy-input"
              textAlignVertical="top"
              value={privacyText}
            />
            <Text style={styles.charCount}>{privacyText.length} characters</Text>
          </View>
        </Panel>

        <Panel testID="settings-privacy-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-privacy-save" variant="primary" />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  charCount: { color: "#8E6D56", fontSize: 11, textAlign: "right" as const },
  editorHeader: { alignItems: "center", flexDirection: "row", gap: 6 },
  editorLabel: { color: "#F8E7D0", fontSize: 13, fontWeight: "700" as const },
  editorWrap: { gap: 8 },
  textInput: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF7ED",
    fontSize: 14,
    lineHeight: 22,
    minHeight: 200,
    padding: 14,
    ...(Platform.OS !== "web" ? { textAlignVertical: "top" as const } : {}),
  },
});
