import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LOYALTY_PROGRAM_SETTINGS,
  type LoyaltyProgramSettings,
  type LoyaltyReward,
  type LoyaltyTier,
  type MembershipReward,
} from "@/constants/loyalty-program";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "loyalty-program-settings";

function normalizeNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}

function sanitizeSettings(input: LoyaltyProgramSettings): LoyaltyProgramSettings {
  return {
    pointsPerDollar: Math.max(0, normalizeNumber(input.pointsPerDollar, DEFAULT_LOYALTY_PROGRAM_SETTINGS.pointsPerDollar)),
    tiers: input.tiers.map((tier: LoyaltyTier, index: number) => ({
      ...tier,
      name: tier.name.trim() || `Tier ${index + 1}`,
      minPoints: Math.max(0, normalizeNumber(tier.minPoints, 0)),
      bonusPoints: Math.max(0, normalizeNumber(tier.bonusPoints ?? 0, 0)),
    })),
    rewards: input.rewards.map((reward: LoyaltyReward, index: number) => ({
      ...reward,
      title: reward.title.trim() || `Reward ${index + 1}`,
      subtitle: reward.subtitle.trim() || "Member redemption reward",
      points: Math.max(0, normalizeNumber(reward.points, 0)),
    })),
    membershipRewards: (input.membershipRewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.membershipRewards).map(
      (mr: MembershipReward, index: number) => ({
        ...mr,
        title: mr.title.trim() || `Membership Reward ${index + 1}`,
        subtitle: mr.subtitle.trim() || "One-time membership reward",
      })
    ),
    vipMembershipRewards: (input.vipMembershipRewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.vipMembershipRewards).map(
      (mr: MembershipReward, index: number) => ({
        ...mr,
        title: mr.title.trim() || `VIP Reward ${index + 1}`,
        subtitle: mr.subtitle.trim() || "One-time VIP membership reward",
      })
    ),
    vipMinTierId: input.vipMinTierId ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.vipMinTierId,
    termsAndConditions: input.termsAndConditions ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.termsAndConditions,
    privacyPolicy: input.privacyPolicy ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.privacyPolicy,
    tierBonusEnabled: input.tierBonusEnabled ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.tierBonusEnabled,
  };
}

interface DbLoyaltySettings {
  id: number;
  points_per_dollar: number;
  tiers: LoyaltyTier[] | null;
  rewards: LoyaltyReward[] | null;
  membership_rewards: MembershipReward[] | null;
  vip_membership_rewards: MembershipReward[] | null;
  vip_min_tier_id: string | null;
  terms_and_conditions: string | null;
  privacy_policy: string | null;
  tier_bonus_enabled: boolean | null;
  updated_at: string;
}

function dbSettingsToLocal(db: DbLoyaltySettings): LoyaltyProgramSettings {
  return {
    pointsPerDollar: db.points_per_dollar,
    tiers: (db.tiers ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.tiers) as LoyaltyTier[],
    rewards: (db.rewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.rewards) as LoyaltyReward[],
    membershipRewards: (db.membership_rewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.membershipRewards) as MembershipReward[],
    vipMembershipRewards: (db.vip_membership_rewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.vipMembershipRewards) as MembershipReward[],
    vipMinTierId: db.vip_min_tier_id ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.vipMinTierId,
    termsAndConditions: db.terms_and_conditions ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.termsAndConditions,
    privacyPolicy: db.privacy_policy ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.privacyPolicy,
    tierBonusEnabled: db.tier_bonus_enabled ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.tierBonusEnabled,
  };
}

async function fetchSettings(): Promise<LoyaltyProgramSettings> {
  try {
    console.log("[LoyaltyProgram] Fetching settings from Supabase...");
    const { data, error } = await supabase
      .from("loyalty_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[LoyaltyProgram] Supabase error:", error.message);
      throw error;
    }

    if (data) {
      const settings = sanitizeSettings(dbSettingsToLocal(data as DbLoyaltySettings));
      console.log("[LoyaltyProgram] Loaded settings from Supabase");
      return settings;
    }

    console.log("[LoyaltyProgram] No settings in Supabase, using defaults");
    return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
  } catch (err) {
    console.error("[LoyaltyProgram] Failed to fetch from Supabase, falling back to local:", err);
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
    try {
      return sanitizeSettings(JSON.parse(stored) as LoyaltyProgramSettings);
    } catch {
      return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
    }
  }
}

export const [LoyaltyProgramProvider, useLoyaltyProgram] = createContextHook(() => {
  const [settings, setSettings] = useState<LoyaltyProgramSettings>(DEFAULT_LOYALTY_PROGRAM_SETTINGS);

  const settingsQuery = useQuery({
    queryKey: ["loyalty-program-settings"],
    queryFn: fetchSettings,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: LoyaltyProgramSettings) => {
      const sanitized = sanitizeSettings(nextSettings);
      console.log("[LoyaltyProgram] Saving settings to Supabase...");

      const { error } = await supabase
        .from("loyalty_settings")
        .upsert({
          id: 1,
          points_per_dollar: sanitized.pointsPerDollar,
          tiers: sanitized.tiers as unknown as Record<string, unknown>[],
          rewards: sanitized.rewards as unknown as Record<string, unknown>[],
          membership_rewards: sanitized.membershipRewards as unknown as Record<string, unknown>[],
          vip_membership_rewards: sanitized.vipMembershipRewards as unknown as Record<string, unknown>[],
          vip_min_tier_id: sanitized.vipMinTierId,
          terms_and_conditions: sanitized.termsAndConditions,
          privacy_policy: sanitized.privacyPolicy,
          tier_bonus_enabled: sanitized.tierBonusEnabled,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("[LoyaltyProgram] Supabase save error:", error.message);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        console.log("[LoyaltyProgram] Saved to local storage as fallback");
      } else {
        console.log("[LoyaltyProgram] Saved to Supabase");
      }

      return sanitized;
    },
    onSuccess: (savedSettings: LoyaltyProgramSettings) => {
      setSettings(savedSettings);
    },
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const updateSettings = useCallback(
    (nextSettings: LoyaltyProgramSettings) => {
      saveSettingsMutation.mutate(nextSettings);
    },
    [saveSettingsMutation],
  );

  const resetSettings = useCallback(() => {
    saveSettingsMutation.mutate(DEFAULT_LOYALTY_PROGRAM_SETTINGS);
  }, [saveSettingsMutation]);

  return useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      isLoading: settingsQuery.isLoading,
      isSaving: saveSettingsMutation.isPending,
      errorMessage: settingsQuery.error instanceof Error
        ? settingsQuery.error.message
        : saveSettingsMutation.error instanceof Error
          ? saveSettingsMutation.error.message
          : null,
    }),
    [resetSettings, saveSettingsMutation.error, saveSettingsMutation.isPending, settings, settingsQuery.error, settingsQuery.isLoading, updateSettings],
  );
});
