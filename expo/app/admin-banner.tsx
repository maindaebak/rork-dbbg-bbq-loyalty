import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { ImageIcon, Save, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";

import {
  ActionButton,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

export default function AdminBannerScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [bannerImageUrl, setBannerImageUrl] = useState<string>(settings.bannerImageUrl ?? "");

  useEffect(() => {
    setBannerImageUrl(settings.bannerImageUrl ?? "");
  }, [settings.bannerImageUrl]);

  const handleSave = useCallback(() => {
    const next = {
      ...settings,
      bannerImageUrl: bannerImageUrl.trim(),
    };
    console.log("[AdminBanner] Saving banner URL", next.bannerImageUrl);
    updateSettings(next);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Dashboard banner has been updated.");
  }, [bannerImageUrl, settings, updateSettings]);

  return (
    <>
      <Stack.Screen options={{ title: "Dashboard Banner", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Banner config"
        subtitle="Set the banner image that displays on the member dashboard."
        title="Dashboard banner."
        heroRight={
          <View style={styles.iconBadge} testID="admin-banner-badge">
            <ImageIcon color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="admin-banner-panel">
          <SectionTitle
            copy="Enter an image URL to display as the banner on the member dashboard."
            title="Banner Image URL"
          />
          <View style={styles.bannerEditorWrap}>
            <View style={styles.bannerEditorHeader}>
              <ImageIcon color="#F7C58B" size={14} />
              <Text style={styles.bannerEditorLabel}>Image URL</Text>
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              onChangeText={setBannerImageUrl}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor="#8E6D56"
              style={styles.bannerUrlInput}
              testID="admin-banner-url-input"
              value={bannerImageUrl}
            />
            {bannerImageUrl.trim().length > 0 && (
              <View style={styles.bannerPreviewWrap}>
                <Text style={styles.bannerPreviewLabel}>Preview</Text>
                <View style={styles.bannerPreviewContainer}>
                  <Image
                    source={{ uri: bannerImageUrl.trim() }}
                    style={styles.bannerPreviewImage}
                    contentFit="cover"
                    testID="admin-banner-preview"
                  />
                  <Pressable
                    onPress={() => setBannerImageUrl("")}
                    style={({ pressed }) => [styles.bannerRemoveBtn, pressed && { opacity: 0.7 }]}
                    testID="admin-banner-remove"
                  >
                    <X color="#FFF7ED" size={14} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </Panel>

        <Panel testID="admin-banner-save-panel">
          <ActionButton
            icon={Save}
            label={isSaving ? "Saving..." : "Save banner"}
            onPress={handleSave}
            testID="admin-banner-save-button"
            variant="primary"
          />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  iconBadge: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  bannerEditorWrap: {
    gap: 10,
  },
  bannerEditorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  bannerEditorLabel: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  bannerUrlInput: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF7ED",
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bannerPreviewWrap: {
    gap: 8,
  },
  bannerPreviewLabel: {
    color: "#C8AA94",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  bannerPreviewContainer: {
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden" as const,
    position: "relative" as const,
  },
  bannerPreviewImage: {
    borderRadius: 16,
    height: 160,
    width: "100%",
  },
  bannerRemoveBtn: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    position: "absolute" as const,
    right: 8,
    top: 8,
    width: 28,
  },
});
