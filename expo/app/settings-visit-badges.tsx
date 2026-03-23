import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Flame, Plus, Save, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import type { VisitBadge } from "@/constants/loyalty-program";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SettingsVisitBadgesScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [visitBadges, setVisitBadges] = useState<VisitBadge[]>(settings.visitBadges ?? []);

  useEffect(() => {
    setVisitBadges(settings.visitBadges ?? []);
  }, [settings.visitBadges]);

  const handleSave = useCallback(() => {
    console.log("[SettingsVisitBadges] Saving:", visitBadges);
    updateSettings({ ...settings, visitBadges });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Visit badges have been updated.");
  }, [visitBadges, settings, updateSettings]);

  const updateVisitBadge = useCallback((index: number, field: keyof VisitBadge, value: string) => {
    setVisitBadges((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        if (field === "minVisits") return { ...b, minVisits: parseInt(value, 10) || 1 };
        return { ...b, [field]: value };
      }),
    );
  }, []);

  const addVisitBadge = useCallback(() => {
    setVisitBadges((prev) => [...prev, { id: uid(), name: "", minVisits: 5 }]);
  }, []);

  const removeVisitBadge = useCallback((index: number) => {
    setVisitBadges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Visit Badges", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Engagement"
        subtitle="Configure visit-based badges that appear on member profiles. Each badge requires a minimum number of visits."
        title="Visit badges."
        heroRight={<Flame color="#F59E0B" size={28} />}
      >
        <Panel testID="settings-badges-panel">
          <SectionTitle copy="Each badge requires a minimum number of visits." title="Visit Badges" />
          {visitBadges.map((badge, index) => (
            <View key={badge.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Flame color="#F59E0B" size={14} />
                <Text style={styles.editCardIndex}>Badge {index + 1}</Text>
                <Pressable onPress={() => removeVisitBadge(index)} style={styles.removeBtn} testID={`settings-remove-badge-${index}`}>
                  <Trash2 color="#EF4444" size={14} />
                </Pressable>
              </View>
              <InputField label="Badge name" onChangeText={(v) => updateVisitBadge(index, "name", v)} placeholder="e.g. Regular Customer" testID={`settings-badge-name-${index}`} value={badge.name} />
              <InputField label="Minimum visits required" keyboardType="numeric" onChangeText={(v) => updateVisitBadge(index, "minVisits", v.replace(/\D/g, ""))} placeholder="5" testID={`settings-badge-visits-${index}`} value={String(badge.minVisits)} />
            </View>
          ))}
          <Pressable onPress={addVisitBadge} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]} testID="settings-add-badge">
            <Plus color="#F59E0B" size={16} />
            <Text style={styles.addBtnText}>Add badge</Text>
          </Pressable>
        </Panel>

        <Panel testID="settings-badges-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-badges-save" variant="primary" />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 14,
    borderStyle: "dashed" as const,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 14,
  },
  addBtnText: { color: "#F59E0B", fontSize: 14, fontWeight: "700" as const },
  editCard: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  editCardHeader: { alignItems: "center", flexDirection: "row", gap: 8 },
  editCardIndex: { color: "#C8AA94", flex: 1, fontSize: 12, fontWeight: "700" as const, textTransform: "uppercase" as const },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  removeBtn: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
});
