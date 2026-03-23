import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { ArrowDown, ArrowUp, Check, Plus, Save, Sparkles, Trash2 } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import type { MemberPerk } from "@/constants/loyalty-program";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

const TIER_COLORS = ["#F59E0B", "#FB7185", "#F97316", "#A78BFA", "#34D399", "#60A5FA"];

const PERK_ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "zap", label: "⚡" },
  { value: "beer", label: "🍺" },
  { value: "cake", label: "🎂" },
  { value: "sparkles", label: "✨" },
  { value: "tag", label: "🏷️" },
  { value: "percent", label: "%" },
  { value: "party", label: "🎉" },
];

function uid(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function SettingsMemberPerksScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [memberPerks, setMemberPerks] = useState<MemberPerk[]>(settings.memberPerks ?? []);

  useEffect(() => {
    setMemberPerks(settings.memberPerks ?? []);
  }, [settings.memberPerks]);

  const tiers = settings.tiers;

  const handleSave = useCallback(() => {
    console.log("[SettingsMemberPerks] Saving:", memberPerks);
    updateSettings({ ...settings, memberPerks });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Member perks have been updated.");
  }, [memberPerks, settings, updateSettings]);

  const updateMemberPerk = useCallback((index: number, field: keyof MemberPerk, value: string | boolean) => {
    setMemberPerks((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        return { ...p, [field]: value };
      }),
    );
  }, []);

  const addMemberPerk = useCallback(() => {
    const color = TIER_COLORS[memberPerks.length % TIER_COLORS.length];
    setMemberPerks((prev) => [...prev, { id: uid(), title: "", description: "", accent: color, icon: "zap", active: true, requiredTiers: [] }]);
  }, [memberPerks.length]);

  const removeMemberPerk = useCallback((index: number) => {
    setMemberPerks((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleMemberPerkTier = useCallback((perkIndex: number, tierId: string) => {
    setMemberPerks((prev) =>
      prev.map((p, i) => {
        if (i !== perkIndex) return p;
        const current = p.requiredTiers ?? [];
        const next = current.includes(tierId) ? current.filter((id) => id !== tierId) : [...current, tierId];
        return { ...p, requiredTiers: next };
      }),
    );
  }, []);

  const moveMemberPerk = useCallback((index: number, direction: "up" | "down") => {
    setMemberPerks((prev) => {
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
      <Stack.Screen options={{ title: "Member Perks", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Exclusive deals"
        subtitle="Create exclusive deals and special offers available to members throughout the year."
        title="Member perks."
        heroRight={<Sparkles color="#FBBF24" size={28} />}
      >
        <Panel testID="settings-perks-panel">
          <SectionTitle copy="These are display-only perks (not redeemable with points)." title="Member-Only Perks" />
          {memberPerks.map((perk, index) => (
            <View key={perk.id} style={styles.editCard}>
              <View style={styles.editCardHeader}>
                <Sparkles color="#FBBF24" size={14} />
                <Text style={styles.editCardIndex}>Perk {index + 1}</Text>
                <View style={styles.reorderBtnGroup}>
                  <Pressable onPress={() => moveMemberPerk(index, "up")} style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]} disabled={index === 0} testID={`settings-move-up-perk-${index}`}>
                    <ArrowUp color={index === 0 ? "#5A4A3F" : "#FBBF24"} size={14} />
                  </Pressable>
                  <Pressable onPress={() => moveMemberPerk(index, "down")} style={[styles.reorderBtn, index === memberPerks.length - 1 && styles.reorderBtnDisabled]} disabled={index === memberPerks.length - 1} testID={`settings-move-down-perk-${index}`}>
                    <ArrowDown color={index === memberPerks.length - 1 ? "#5A4A3F" : "#FBBF24"} size={14} />
                  </Pressable>
                </View>
                <Pressable onPress={() => removeMemberPerk(index)} style={styles.removeBtn} testID={`settings-remove-perk-${index}`}>
                  <Trash2 color="#EF4444" size={14} />
                </Pressable>
              </View>
              <InputField label="Perk name" onChangeText={(v) => updateMemberPerk(index, "title", v)} placeholder="e.g. Happy Hour Special" testID={`settings-perk-title-${index}`} value={perk.title} />
              <InputField label="Description" onChangeText={(v) => updateMemberPerk(index, "description", v)} placeholder="e.g. 20% off all drinks every weekday 4-6 PM" testID={`settings-perk-desc-${index}`} value={perk.description} />
              <View style={styles.perkIconRow}>
                <Text style={styles.perkIconLabel}>Icon</Text>
                <View style={styles.perkIconGrid}>
                  {PERK_ICON_OPTIONS.map((opt) => (
                    <Pressable key={opt.value} onPress={() => updateMemberPerk(index, "icon", opt.value)} style={[styles.perkIconOption, perk.icon === opt.value && styles.perkIconOptionSelected]} testID={`settings-perk-icon-${index}-${opt.value}`}>
                      <Text style={styles.perkIconEmoji}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <View style={styles.toggleTextWrap}>
                    <Text style={styles.toggleLabel}>Active</Text>
                    <Text style={styles.toggleCaption}>{perk.active ? "Visible to members" : "Hidden from members"}</Text>
                  </View>
                </View>
                <Switch
                  value={perk.active}
                  onValueChange={(v) => updateMemberPerk(index, "active", v)}
                  trackColor={{ false: "rgba(142, 109, 86, 0.3)", true: "rgba(251, 191, 36, 0.4)" }}
                  thumbColor={perk.active ? "#FBBF24" : "#8E6D56"}
                  testID={`settings-perk-active-${index}`}
                />
              </View>
              <View style={styles.tierVisibilitySection}>
                <Text style={styles.tierVisibilityLabel}>Available to tiers</Text>
                <Text style={styles.tierVisibilityHint}>
                  {(perk.requiredTiers ?? []).length === 0
                    ? "Available to all tiers (none selected = all)"
                    : `Available to ${(perk.requiredTiers ?? []).length} selected tier(s). Other tiers will see it as locked.`}
                </Text>
                <View style={styles.tierChipGrid}>
                  {tiers.map((tier) => {
                    const isSelected = (perk.requiredTiers ?? []).includes(tier.id);
                    return (
                      <Pressable
                        key={tier.id}
                        onPress={() => toggleMemberPerkTier(index, tier.id)}
                        style={({ pressed }) => [styles.tierChip, isSelected && { backgroundColor: tier.accent, borderColor: tier.accent }, pressed && { opacity: 0.8 }]}
                        testID={`settings-perk-tier-${index}-${tier.id}`}
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
          <Pressable onPress={addMemberPerk} style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]} testID="settings-add-perk">
            <Plus color="#FBBF24" size={16} />
            <Text style={styles.addPerkBtnText}>Add perk</Text>
          </Pressable>
        </Panel>

        <Panel testID="settings-perks-save-panel">
          <ActionButton icon={Save} label={isSaving ? "Saving..." : "Save changes"} onPress={handleSave} testID="settings-perks-save" variant="primary" />
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
  addPerkBtnText: { color: "#FBBF24", fontSize: 14, fontWeight: "700" as const },
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
  reorderBtnGroup: { alignItems: "center", flexDirection: "row" as const, gap: 4 },
  reorderBtn: {
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  reorderBtnDisabled: { opacity: 0.4 },
  perkIconEmoji: { fontSize: 16 },
  perkIconGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  perkIconLabel: { color: "#F8E7D0", fontSize: 13, fontWeight: "700" as const },
  perkIconOption: {
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    justifyContent: "center" as const,
    width: 40,
  },
  perkIconOptionSelected: { backgroundColor: "rgba(251, 191, 36, 0.15)", borderColor: "#FBBF24" },
  perkIconRow: { gap: 8 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  removeBtn: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
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
  tierChipDot: { borderRadius: 999, height: 8, width: 8 },
  tierChipGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
  tierChipText: { color: "#F8E7D0", fontSize: 13, fontWeight: "700" as const },
  tierVisibilityHint: { color: "#8E6D56", fontSize: 12, fontWeight: "600" as const },
  tierVisibilityLabel: { color: "#F8E7D0", fontSize: 13, fontWeight: "700" as const },
  tierVisibilitySection: { gap: 8 },
  toggleCaption: { color: "#C8AA94", fontSize: 12 },
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
