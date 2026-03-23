import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { ArrowDown, ArrowUp, Check, Crown, Plus, Save, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import type { MembershipReward } from "@/constants/loyalty-program";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

const TIER_COLORS = ["#F59E0B", "#FB7185", "#F97316", "#A78BFA", "#34D399", "#60A5FA"];

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SettingsMembershipRewardsScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [membershipRewards, setMembershipRewards] = useState<MembershipReward[]>(settings.membershipRewards ?? []);

  useEffect(() => {
    setMembershipRewards(settings.membershipRewards ?? []);
  }, [settings.membershipRewards]);

  const tiers = settings.tiers;

  const handleSave = useCallback(() => {
    console.log("[SettingsMembershipRewards] Saving:", membershipRewards);
    updateSettings({ ...settings, membershipRewards });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Membership rewards have been updated.");
  }, [membershipRewards, settings, updateSettings]);

  const updateMembershipReward = useCallback((index: number, field: keyof MembershipReward, value: string) => {
    setMembershipRewards((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        return { ...r, [field]: value };
      }),
    );
  }, []);

  const addMembershipReward = useCallback(() => {
    const color = TIER_COLORS[membershipRewards.length % TIER_COLORS.length];
    setMembershipRewards((prev) => [...prev, { id: uid(), title: "", subtitle: "", accent: color, requiredTiers: [] }]);
  }, [membershipRewards.length]);

  const removeMembershipReward = useCallback((index: number) => {
    setMembershipRewards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleMembershipRewardTier = useCallback((rewardIndex: number, tierId: string) => {
    setMembershipRewards((prev) =>
      prev.map((r, i) => {
        if (i !== rewardIndex) return r;
        const current = r.requiredTiers ?? [];
        const next = current.includes(tierId) ? current.filter((id) => id !== tierId) : [...current, tierId];
        return { ...r, requiredTiers: next };
      }),
    );
  }, []);

  const moveMembershipReward = useCallback((index: number, direction: "up" | "down") => {
    setMembershipRewards((prev) => {
      const newArr = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;
      const temp = newArr[targetIndex];
      newArr[targetIndex] = newArr[index];
      newArr[index] = temp;
      return newArr;
    });
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "Membership Rewards", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Member exclusives"
        subtitle="Define one-time rewards available to all members. No points needed — each can be claimed once per member."
        title="Membership rewards."
        heroRight={<Crown color="#34D399" size={28} />}
      >
        <Panel testID="settings-membership-rewards-panel">
          <SectionTitle copy="Define one-time rewards available to all members." title="Membership Only Rewards" />
          {membershipRewards.map((reward, index) => (
            <View key={reward.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Crown color="#34D399" size={14} />
                <Text style={styles.editCardIndex}>Membership Reward {index + 1}</Text>
                <View style={styles.reorderBtnGroup}>
                  <Pressable onPress={() => moveMembershipReward(index, "up")} style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]} disabled={index === 0} testID={`settings-move-up-mr-${index}`}>
                    <ArrowUp color={index === 0 ? "#5A4A3F" : "#F7C58B"} size={14} />
                  </Pressable>
                  <Pressable onPress={() => moveMembershipReward(index, "down")} style={[styles.reorderBtn, index === membershipRewards.length - 1 && styles.reorderBtnDisabled]} disabled={index === membershipRewards.length - 1} testID={`settings-move-down-mr-${index}`}>
                    <ArrowDown color={index === membershipRewards.length - 1 ? "#5A4A3F" : "#F7C58B"} size={14} />
                  </Pressable>
                </View>
                <Pressable onPress={() => removeMembershipReward(index)} style={styles.removeBtn} testID={`settings-remove-mr-${index}`}>
                  <Trash2 color="#EF4444" size={14} />
                </Pressable>
              </View>
              <InputField label="Reward name" onChangeText={(v) => updateMembershipReward(index, "title", v)} placeholder="e.g. Welcome Drink" testID={`settings-mr-title-${index}`} value={reward.title} />
              <InputField label="Description" onChangeText={(v) => updateMembershipReward(index, "subtitle", v)} placeholder="e.g. Complimentary soft drink" testID={`settings-mr-subtitle-${index}`} value={reward.subtitle} />
              <View style={styles.tierVisibilitySection}>
                <Text style={styles.tierVisibilityLabel}>Redeemable by tiers</Text>
                <Text style={styles.tierVisibilityHint}>
                  {(reward.requiredTiers ?? []).length === 0
                    ? "Redeemable by all tiers (none selected = all)"
                    : `Redeemable by ${(reward.requiredTiers ?? []).length} selected tier(s). Other tiers will see it as locked.`}
                </Text>
                <View style={styles.tierChipGrid}>
                  {tiers.map((tier) => {
                    const isSelected = (reward.requiredTiers ?? []).includes(tier.id);
                    return (
                      <Pressable
                        key={tier.id}
                        onPress={() => toggleMembershipRewardTier(index, tier.id)}
                        style={({ pressed }) => [styles.tierChip, isSelected && { backgroundColor: tier.accent, borderColor: tier.accent }, pressed && { opacity: 0.8 }]}
                        testID={`settings-mr-tier-${index}-${tier.id}`}
                      >
                        <View style={[styles.tierChipDot, { backgroundColor: isSelected ? "#1A120E" : tier.accent }]} />
                        <Text style={[styles.tierChipText, isSelected && { color: "#1A120E" }]}>{tier.name || "Unnamed"}</Text>
                        {isSelected && <Check color="#1A120E" size={14} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
          <Pressable onPress={addMembershipReward} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]} testID="settings-add-mr">
            <Plus color="#34D399" size={16} />
            <Text style={styles.addMembershipBtnText}>Add membership reward</Text>
          </Pressable>
        </Panel>

        <Panel testID="settings-mr-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-mr-save" variant="primary" />
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
  addMembershipBtnText: { color: "#34D399", fontSize: 14, fontWeight: "700" as const },
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
  reorderBtnGroup: { alignItems: "center", flexDirection: "row" as const, gap: 4 },
  reorderBtn: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  reorderBtnDisabled: { opacity: 0.4 },
  tierChip: {
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tierChipDot: { borderRadius: 999, height: 8, width: 8 },
  tierChipGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  tierChipText: { color: "#F8E7D0", fontSize: 13, fontWeight: "700" as const },
  tierVisibilityHint: { color: "#8E6D56", fontSize: 12, fontWeight: "600" as const },
  tierVisibilityLabel: { color: "#F8E7D0", fontSize: 13, fontWeight: "700" as const },
  tierVisibilitySection: { gap: 8 },
});
