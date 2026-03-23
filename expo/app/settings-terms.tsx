import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { FileText, Save } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Text, TextInput, View } from "react-native";

import {
  ActionButton,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

export default function SettingsTermsScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [termsText, setTermsText] = useState<string>(settings.termsAndConditions ?? "");

  useEffect(() => {
    setTermsText(settings.termsAndConditions ?? "");
  }, [settings.termsAndConditions]);

  const handleSave = useCallback(() => {
    console.log("[SettingsTerms] Saving terms");
    updateSettings({ ...settings, termsAndConditions: termsText });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Terms & conditions have been updated.");
  }, [termsText, settings, updateSettings]);

  return (
    <>
      <Stack.Screen options={{ title: "Terms & Conditions", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Legal"
        subtitle="Edit the terms and conditions that members must agree to when signing up."
        title="Terms & conditions."
        heroRight={<FileText color="#F7C58B" size={28} />}
      >
        <Panel testID="settings-terms-panel">
          <SectionTitle copy="Edit the terms content below." title="Terms & Conditions" />
          <View style={styles.editorWrap}>
            <View style={styles.editorHeader}>
              <FileText color="#F7C58B" size={14} />
              <Text style={styles.editorLabel}>Terms content</Text>
            </View>
            <TextInput
              multiline
              numberOfLines={12}
              onChangeText={setTermsText}
              placeholder="Enter your terms and conditions here..."
              placeholderTextColor="#8E6D56"
              style={styles.textInput}
              testID="settings-terms-input"
              textAlignVertical="top"
              value={termsText}
            />
            <Text style={styles.charCount}>{termsText.length} characters</Text>
          </View>
        </Panel>

        <Panel testID="settings-terms-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-terms-save" variant="primary" />
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
