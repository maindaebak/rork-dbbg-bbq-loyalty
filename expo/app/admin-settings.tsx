import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CircleDollarSign,
  Crown,
  FileText,
  Gift,
  Plus,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import type { LoyaltyProgramSettings, LoyaltyReward, LoyaltyTier, MembershipReward } from "@/constants/loyalty-program";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

const TIER_COLORS = ["#F59E0B", "#FB7185", "#F97316", "#A78BFA", "#34D399", "#60A5FA"];

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AdminSettingsScreen() {
  const { settings, updateSettings, resetSettings, isSaving } = useLoyaltyProgram();

  const [pointsPerDollar, setPointsPerDollar] = useState<string>(String(settings.pointsPerDollar));
  const [tiers, setTiers] = useState<LoyaltyTier[]>(settings.tiers);
  const [rewards, setRewards] = useState<LoyaltyReward[]>(settings.rewards);
  const [membershipRewards, setMembershipRewards] = useState<MembershipReward[]>(settings.membershipRewards ?? []);
  const [termsText, setTermsText] = useState<string>(settings.termsAndConditions ?? "");
  const [privacyText, setPrivacyText] = useState<string>(settings.privacyPolicy ?? "");
  const [tierBonusEnabled, setTierBonusEnabled] = useState<boolean>(settings.tierBonusEnabled ?? true);

  useEffect(() => {
    setPointsPerDollar(String(settings.pointsPerDollar));
    setTiers(settings.tiers);
    setRewards(settings.rewards);
    setMembershipRewards(settings.membershipRewards ?? []);
    setTermsText(settings.termsAndConditions ?? "");
    setPrivacyText(settings.privacyPolicy ?? "");
    setTierBonusEnabled(settings.tierBonusEnabled ?? true);
  }, [settings]);

  const handleSave = useCallback(() => {
    const ppd = parseInt(pointsPerDollar, 10);
    if (!ppd || ppd <= 0) {
      Alert.alert("Invalid value", "Points per dollar must be a positive number.");
      return;
    }
    const next: LoyaltyProgramSettings = {
      pointsPerDollar: ppd,
      tiers,
      rewards,
      membershipRewards,
      termsAndConditions: termsText,
      privacyPolicy: privacyText,
      tierBonusEnabled,
    };
    console.log("[AdminSettings] Saving settings", next);
    updateSettings(next);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Loyalty program settings have been updated.");
  }, [membershipRewards, pointsPerDollar, privacyText, rewards, termsText, tierBonusEnabled, tiers, updateSettings]);

  const handleReset = useCallback(() => {
    Alert.alert("Reset settings", "Restore all loyalty program settings to defaults?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: () => {
          console.log("[AdminSettings] Resetting to defaults");
          resetSettings();
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [resetSettings]);

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
    setTiers((prev) => [
      ...prev,
      { id: uid(), name: "", minPoints: 0, accent: color, bonusPoints: 0 },
    ]);
  }, [tiers.length]);

  const removeTier = useCallback((index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
    setRewards((prev) => [
      ...prev,
      { id: uid(), title: "", points: 0, subtitle: "", accent: color },
    ]);
  }, [rewards.length]);

  const removeReward = useCallback((index: number) => {
    setRewards((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
    setMembershipRewards((prev) => [
      ...prev,
      { id: uid(), title: "", subtitle: "", accent: color, visibleTiers: [] },
    ]);
  }, [membershipRewards.length]);

  const removeMembershipReward = useCallback((index: number) => {
    setMembershipRewards((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleMembershipRewardTier = useCallback((rewardIndex: number, tierId: string) => {
    setMembershipRewards((prev) =>
      prev.map((r, i) => {
        if (i !== rewardIndex) return r;
        const current = r.visibleTiers ?? [];
        const next = current.includes(tierId)
          ? current.filter((id) => id !== tierId)
          : [...current, tierId];
        return { ...r, visibleTiers: next };
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
      <Stack.Screen options={{ title: "Loyalty Settings", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Program config"
        subtitle="Adjust tiers, rewards, and points-per-dollar. Changes take effect immediately for all members."
        title="Loyalty settings."
        heroRight={
          <View style={styles.iconBadge} testID="admin-settings-badge">
            <CircleDollarSign color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="admin-ppd-panel">
          <SectionTitle
            copy="How many points members earn for each dollar spent."
            title="Points per dollar"
          />
          <InputField
            label="Points per $1"
            keyboardType="numeric"
            onChangeText={(v) => setPointsPerDollar(v.replace(/\D/g, ""))}
            placeholder="8"
            testID="admin-ppd-input"
            value={pointsPerDollar}
          />
        </Panel>

        <Panel testID="admin-tiers-panel">
          <SectionTitle
            copy="Define membership tiers and the minimum points required for each."
            title="Membership tiers"
          />
          {tiers.map((tier, index) => (
            <View key={tier.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <View style={[styles.colorDot, { backgroundColor: tier.accent }]} />
                <Text style={styles.editCardIndex}>Tier {index + 1}</Text>
                {tiers.length > 1 && (
                  <Pressable
                    onPress={() => removeTier(index)}
                    style={styles.removeBtn}
                    testID={`admin-remove-tier-${index}`}
                  >
                    <Trash2 color="#EF4444" size={14} />
                  </Pressable>
                )}
              </View>
              <InputField
                label="Tier name"
                onChangeText={(v) => updateTier(index, "name", v)}
                placeholder="e.g. Gold"
                testID={`admin-tier-name-${index}`}
                value={tier.name}
              />
              <InputField
                label="Min points"
                keyboardType="numeric"
                onChangeText={(v) => updateTier(index, "minPoints", v.replace(/\D/g, ""))}
                placeholder="0"
                testID={`admin-tier-min-${index}`}
                value={String(tier.minPoints)}
              />
              {tierBonusEnabled && (
                <InputField
                  label="Bonus points on reaching tier"
                  keyboardType="numeric"
                  onChangeText={(v) => updateTier(index, "bonusPoints", v.replace(/\D/g, ""))}
                  placeholder="0"
                  testID={`admin-tier-bonus-${index}`}
                  value={String(tier.bonusPoints ?? 0)}
                />
              )}
            </View>
          ))}
          <Pressable
            onPress={addTier}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            testID="admin-add-tier"
          >
            <Plus color="#F7C58B" size={16} />
            <Text style={styles.addBtnText}>Add tier</Text>
          </Pressable>
        </Panel>

        <Panel testID="admin-tier-bonus-panel">
          <SectionTitle
            copy="Automatically award bonus points when members reach a new tier."
            title="Tier bonus rewards"
          />
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
              testID="admin-tier-bonus-toggle"
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

        <Panel testID="admin-rewards-panel">
          <SectionTitle
            copy="Define redeemable rewards and the points required for each."
            title="Rewards"
          />
          {rewards.map((reward, index) => (
            <View key={reward.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Gift color="#F7C58B" size={14} />
                <Text style={styles.editCardIndex}>Reward {index + 1}</Text>
                {rewards.length > 1 && (
                  <Pressable
                    onPress={() => removeReward(index)}
                    style={styles.removeBtn}
                    testID={`admin-remove-reward-${index}`}
                  >
                    <Trash2 color="#EF4444" size={14} />
                  </Pressable>
                )}
              </View>
              <InputField
                label="Reward name"
                onChangeText={(v) => updateReward(index, "title", v)}
                placeholder="e.g. Free Appetizer"
                testID={`admin-reward-title-${index}`}
                value={reward.title}
              />
              <InputField
                label="Description"
                onChangeText={(v) => updateReward(index, "subtitle", v)}
                placeholder="e.g. Chef's choice appetizer"
                testID={`admin-reward-subtitle-${index}`}
                value={reward.subtitle}
              />
              <InputField
                label="Points required"
                keyboardType="numeric"
                onChangeText={(v) => updateReward(index, "points", v.replace(/\D/g, ""))}
                placeholder="100"
                testID={`admin-reward-points-${index}`}
                value={String(reward.points)}
              />
            </View>
          ))}
          <Pressable
            onPress={addReward}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            testID="admin-add-reward"
          >
            <Plus color="#F7C58B" size={16} />
            <Text style={styles.addBtnText}>Add reward</Text>
          </Pressable>
        </Panel>


        <Panel testID="admin-membership-rewards-panel">
          <SectionTitle
            copy="Define one-time rewards available to all members. No points needed — each can be claimed once per member."
            title="Membership Only Rewards"
          />
          {membershipRewards.map((reward, index) => (
            <View key={reward.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Crown color="#34D399" size={14} />
                <Text style={styles.editCardIndex}>Membership Reward {index + 1}</Text>
                <View style={styles.reorderBtnGroup}>
                  <Pressable
                    onPress={() => moveMembershipReward(index, "up")}
                    style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                    disabled={index === 0}
                    testID={`admin-move-up-membership-reward-${index}`}
                  >
                    <ArrowUp color={index === 0 ? "#5A4A3F" : "#F7C58B"} size={14} />
                  </Pressable>
                  <Pressable
                    onPress={() => moveMembershipReward(index, "down")}
                    style={[styles.reorderBtn, index === membershipRewards.length - 1 && styles.reorderBtnDisabled]}
                    disabled={index === membershipRewards.length - 1}
                    testID={`admin-move-down-membership-reward-${index}`}
                  >
                    <ArrowDown color={index === membershipRewards.length - 1 ? "#5A4A3F" : "#F7C58B"} size={14} />
                  </Pressable>
                </View>
                <Pressable
                  onPress={() => removeMembershipReward(index)}
                  style={styles.removeBtn}
                  testID={`admin-remove-membership-reward-${index}`}
                >
                  <Trash2 color="#EF4444" size={14} />
                </Pressable>
              </View>
              <InputField
                label="Reward name"
                onChangeText={(v) => updateMembershipReward(index, "title", v)}
                placeholder="e.g. Welcome Drink"
                testID={`admin-membership-reward-title-${index}`}
                value={reward.title}
              />
              <InputField
                label="Description"
                onChangeText={(v) => updateMembershipReward(index, "subtitle", v)}
                placeholder="e.g. Complimentary soft drink for new members"
                testID={`admin-membership-reward-subtitle-${index}`}
                value={reward.subtitle}
              />
              <View style={styles.tierVisibilitySection}>
                <Text style={styles.tierVisibilityLabel}>Visible to tiers</Text>
                <Text style={styles.tierVisibilityHint}>
                  {(reward.visibleTiers ?? []).length === 0
                    ? "Visible to all tiers (none selected = all)"
                    : `Visible to ${(reward.visibleTiers ?? []).length} selected tier(s)`}
                </Text>
                <View style={styles.tierChipGrid}>
                  {tiers.map((tier) => {
                    const isSelected = (reward.visibleTiers ?? []).includes(tier.id);
                    return (
                      <Pressable
                        key={tier.id}
                        onPress={() => toggleMembershipRewardTier(index, tier.id)}
                        style={({ pressed }) => [
                          styles.tierChip,
                          isSelected && { backgroundColor: tier.accent, borderColor: tier.accent },
                          pressed && { opacity: 0.8 },
                        ]}
                        testID={`admin-membership-reward-tier-${index}-${tier.id}`}
                      >
                        <View style={[styles.tierChipDot, { backgroundColor: isSelected ? "#1A120E" : tier.accent }]} />
                        <Text style={[styles.tierChipText, isSelected && { color: "#1A120E" }]}>
                          {tier.name || "Unnamed"}
                        </Text>
                        {isSelected && <Check color="#1A120E" size={14} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
          <Pressable
            onPress={addMembershipReward}
            style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}
            testID="admin-add-membership-reward"
          >
            <Plus color="#34D399" size={16} />
            <Text style={styles.addMembershipBtnText}>Add membership reward</Text>
          </Pressable>
        </Panel>

        <Panel testID="admin-privacy-panel">
          <SectionTitle
            copy="Edit the privacy policy that members can view. This explains how you collect, use, and protect their information."
            title="Privacy Policy"
          />
          <View style={styles.termsEditorWrap}>
            <View style={styles.termsEditorHeader}>
              <Shield color="#F7C58B" size={14} />
              <Text style={styles.termsEditorLabel}>Privacy policy content</Text>
            </View>
            <TextInput
              multiline
              numberOfLines={12}
              onChangeText={setPrivacyText}
              placeholder="Enter your privacy policy here..."
              placeholderTextColor="#8E6D56"
              style={styles.termsInput}
              testID="admin-privacy-input"
              textAlignVertical="top"
              value={privacyText}
            />
            <Text style={styles.termsCharCount}>{privacyText.length} characters</Text>
          </View>
        </Panel>

        <Panel testID="admin-terms-panel">
          <SectionTitle
            copy="Edit the terms and conditions that members must agree to when signing up."
            title="Terms & Conditions"
          />
          <View style={styles.termsEditorWrap}>
            <View style={styles.termsEditorHeader}>
              <FileText color="#F7C58B" size={14} />
              <Text style={styles.termsEditorLabel}>Terms content</Text>
            </View>
            <TextInput
              multiline
              numberOfLines={12}
              onChangeText={setTermsText}
              placeholder="Enter your terms and conditions here..."
              placeholderTextColor="#8E6D56"
              style={styles.termsInput}
              testID="admin-terms-input"
              textAlignVertical="top"
              value={termsText}
            />
            <Text style={styles.termsCharCount}>{termsText.length} characters</Text>
          </View>
        </Panel>

        <Panel testID="admin-save-panel">
          <ActionButton
            icon={Save}
            label={isSaving ? "Saving..." : "Save all changes"}
            onPress={handleSave}
            testID="admin-save-button"
            variant="primary"
          />
          <ActionButton
            icon={RotateCcw}
            label="Reset to defaults"
            onPress={handleReset}
            testID="admin-reset-button"
            variant="secondary"
          />
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
  addBtnText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  colorDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  editCard: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  editCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  editCardIndex: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 12,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
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
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  removeBtn: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  reorderBtnGroup: {
    alignItems: "center",
    flexDirection: "row" as const,
    gap: 4,
  },
  reorderBtn: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  reorderBtnDisabled: {
    opacity: 0.4,
  },
  termsCharCount: {
    color: "#8E6D56",
    fontSize: 11,
    textAlign: "right" as const,
  },
  termsEditorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  termsEditorLabel: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  termsEditorWrap: {
    gap: 8,
  },
  termsInput: {
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
  toggleInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  toggleIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  toggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  toggleLabel: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  toggleCaption: {
    color: "#C8AA94",
    fontSize: 12,
  },
  bonusSummary: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  bonusSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  bonusSummaryName: {
    color: "#F8E7D0",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  bonusSummaryPoints: {
    color: "#F7C58B",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  addMembershipBtnText: {
    color: "#34D399",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  tierVisibilitySection: {
    gap: 8,
  },
  tierVisibilityLabel: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  tierVisibilityHint: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  tierChipGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
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
  tierChipDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  tierChipText: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
});
