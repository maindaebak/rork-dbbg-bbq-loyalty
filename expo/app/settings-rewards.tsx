import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Gift, Plus, Save, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import type { LoyaltyReward } from "@/constants/loyalty-program";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

const TIER_COLORS = ["#F59E0B", "#FB7185", "#F97316", "#A78BFA", "#34D399", "#60A5FA"];

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SettingsRewardsScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [rewards, setRewards] = useState<LoyaltyReward[]>(settings.rewards);

  useEffect(() => {
    setRewards(settings.rewards);
  }, [settings.rewards]);

  const handleSave = useCallback(() => {
    console.log("[SettingsRewards] Saving rewards:", rewards);
    updateSettings({ ...settings, rewards });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Rewards have been updated.");
  }, [rewards, settings, updateSettings]);

  const updateReward = useCallback((index: number, field: keyof LoyaltyReward, value: string) => {
    setRewards((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        if (field === "points") return { ...r, points: parseInt(value, 10) || 0 };
        return { ...r, [field]: value };
      }),
    );
  }, []);

  const addReward = useCallback(() => {
    const color = TIER_COLORS[rewards.length % TIER_COLORS.length];
    setRewards((prev) => [...prev, { id: uid(), title: "", points: 0, subtitle: "", accent: color }]);
  }, [rewards.length]);

  const removeReward = useCallback((index: number) => {
    setRewards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Rewards", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Redeemable"
        subtitle="Define redeemable rewards and the points required for each."
        title="Rewards."
        heroRight={<Gift color="#F7C58B" size={28} />}
      >
        <Panel testID="settings-rewards-panel">
          <SectionTitle copy="Define redeemable rewards and the points required for each." title="Rewards" />
          {rewards.map((reward, index) => (
            <View key={reward.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Gift color="#F7C58B" size={14} />
                <Text style={styles.editCardIndex}>Reward {index + 1}</Text>
                {rewards.length > 1 && (
                  <Pressable onPress={() => removeReward(index)} style={styles.removeBtn} testID={`settings-remove-reward-${index}`}>
                    <Trash2 color="#EF4444" size={14} />
                  </Pressable>
                )}
              </View>
              <InputField label="Reward name" onChangeText={(v) => updateReward(index, "title", v)} placeholder="e.g. Free Appetizer" testID={`settings-reward-title-${index}`} value={reward.title} />
              <InputField label="Description" onChangeText={(v) => updateReward(index, "subtitle", v)} placeholder="e.g. Chef's choice appetizer" testID={`settings-reward-subtitle-${index}`} value={reward.subtitle} />
              <InputField label="Points required" keyboardType="numeric" onChangeText={(v) => updateReward(index, "points", v.replace(/\D/g, ""))} placeholder="100" testID={`settings-reward-points-${index}`} value={String(reward.points)} />
            </View>
          ))}
          <Pressable onPress={addReward} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]} testID="settings-add-reward">
            <Plus color="#F7C58B" size={16} />
            <Text style={styles.addBtnText}>Add reward</Text>
          </Pressable>
        </Panel>

        <Panel testID="settings-rewards-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-rewards-save" variant="primary" />
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
  addBtnText: { color: "#F7C58B", fontSize: 14, fontWeight: "700" as const },
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
