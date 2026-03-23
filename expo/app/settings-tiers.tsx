import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { Plus, Save, Sparkles, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import type { LoyaltyTier } from "@/constants/loyalty-program";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

const TIER_COLORS = ["#F59E0B", "#FB7185", "#F97316", "#A78BFA", "#34D399", "#60A5FA"];

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SettingsTiersScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [tiers, setTiers] = useState<LoyaltyTier[]>(settings.tiers);
  const [tierBonusEnabled, setTierBonusEnabled] = useState<boolean>(settings.tierBonusEnabled ?? true);

  useEffect(() => {
    setTiers(settings.tiers);
    setTierBonusEnabled(settings.tierBonusEnabled ?? true);
  }, [settings]);

  const handleSave = useCallback(() => {
    console.log("[SettingsTiers] Saving tiers:", tiers);
    updateSettings({ ...settings, tiers, tierBonusEnabled });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Membership tiers have been updated.");
  }, [tiers, tierBonusEnabled, settings, updateSettings]);

  const updateTier = useCallback((index: number, field: keyof LoyaltyTier, value: string) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== index) return t;
        if (field === "minPoints") return { ...t, minPoints: parseInt(value, 10) || 0 };
        if (field === "bonusPoints") return { ...t, bonusPoints: parseInt(value, 10) || 0 };
        return { ...t, [field]: value };
      }),
    );
  }, []);

  const addTier = useCallback(() => {
    const color = TIER_COLORS[tiers.length % TIER_COLORS.length];
    setTiers((prev) => [...prev, { id: uid(), name: "", minPoints: 0, accent: color, bonusPoints: 0 }]);
  }, [tiers.length]);

  const removeTier = useCallback((index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Membership Tiers", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Tier config"
        subtitle="Define membership tiers, minimum points, and tier bonus rewards."
        title="Membership tiers."
      >
        <Panel testID="settings-tiers-panel">
          <SectionTitle
            copy="Define membership tiers and the minimum points required for each."
            title="Tiers"
          />
          {tiers.map((tier, index) => (
            <View key={tier.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <View style={[styles.colorDot, { backgroundColor: tier.accent }]} />
                <Text style={styles.editCardIndex}>Tier {index + 1}</Text>
                {tiers.length > 1 && (
                  <Pressable onPress={() => removeTier(index)} style={styles.removeBtn} testID={`settings-remove-tier-${index}`}>
                    <Trash2 color="#EF4444" size={14} />
                  </Pressable>
                )}
              </View>
              <InputField label="Tier name" onChangeText={(v) => updateTier(index, "name", v)} placeholder="e.g. Gold" testID={`settings-tier-name-${index}`} value={tier.name} />
              <InputField label="Min points" keyboardType="numeric" onChangeText={(v) => updateTier(index, "minPoints", v.replace(/\D/g, ""))} placeholder="0" testID={`settings-tier-min-${index}`} value={String(tier.minPoints)} />
              {tierBonusEnabled && (
                <InputField label="Bonus points on reaching tier" keyboardType="numeric" onChangeText={(v) => updateTier(index, "bonusPoints", v.replace(/\D/g, ""))} placeholder="0" testID={`settings-tier-bonus-${index}`} value={String(tier.bonusPoints ?? 0)} />
              )}
            </View>
          ))}
          <Pressable onPress={addTier} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]} testID="settings-add-tier">
            <Plus color="#F7C58B" size={16} />
            <Text style={styles.addBtnText}>Add tier</Text>
          </Pressable>
        </Panel>

        <Panel testID="settings-tier-bonus-panel">
          <SectionTitle copy="Automatically award bonus points when members reach a new tier." title="Tier bonus rewards" />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={styles.toggleIconWrap}>
                <Sparkles color={tierBonusEnabled ? "#F7C58B" : "#8E6D56"} size={18} />
              </View>
              <View style={styles.toggleTextWrap}>
                <Text style={styles.toggleLabel}>Auto tier bonus</Text>
                <Text style={styles.toggleCaption}>
                  {tierBonusEnabled ? "Members get bonus points when they reach a new tier" : "Tier bonus rewards are disabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={tierBonusEnabled}
              onValueChange={setTierBonusEnabled}
              trackColor={{ false: "rgba(142, 109, 86, 0.3)", true: "rgba(247, 197, 139, 0.4)" }}
              thumbColor={tierBonusEnabled ? "#F7C58B" : "#8E6D56"}
              testID="settings-tier-bonus-toggle"
            />
          </View>
          {tierBonusEnabled && (
            <View style={styles.bonusSummary}>
              {tiers.map((tier) => (
                <View key={tier.id} style={styles.bonusSummaryRow}>
                  <View style={[styles.colorDot, { backgroundColor: tier.accent }]} />
                  <Text style={styles.bonusSummaryName}>{tier.name || "Unnamed"}</Text>
                  <Text style={styles.bonusSummaryPoints}>
                    {tier.bonusPoints > 0 ? `+${tier.bonusPoints} pts` : "No bonus"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Panel>

        <Panel testID="settings-tiers-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-tiers-save" variant="primary" />
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
  bonusSummary: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  bonusSummaryName: { color: "#F8E7D0", flex: 1, fontSize: 13, fontWeight: "600" as const },
  bonusSummaryPoints: { color: "#F7C58B", fontSize: 13, fontWeight: "800" as const },
  bonusSummaryRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  colorDot: { borderRadius: 999, height: 10, width: 10 },
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
  toggleCaption: { color: "#C8AA94", fontSize: 12 },
  toggleIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  toggleInfo: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12 },
  toggleLabel: { color: "#FFF7ED", fontSize: 14, fontWeight: "700" as const },
  toggleRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  toggleTextWrap: { flex: 1, gap: 2 },
});
