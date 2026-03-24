import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LOYALTY_PROGRAM_SETTINGS,
  type LoyaltyProgramSettings,
  type LoyaltyReward,
  type LoyaltyTier,
  type MemberPerk,
  type MembershipReward,
  type VisitBadge,
} from "@/constants/loyalty-program";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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
        requiredTiers: mr.requiredTiers ?? [],
      })
    ),
    memberPerks: (input.memberPerks ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.memberPerks).map(
      (perk: MemberPerk, index: number) => ({
        ...perk,
        title: perk.title.trim() || `Perk ${index + 1}`,
        description: perk.description.trim() || "Exclusive member perk",
        requiredTiers: perk.requiredTiers ?? [],
        active: perk.active ?? true,
      })
    ),
    termsAndConditions: input.termsAndConditions ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.termsAndConditions,
    privacyPolicy: input.privacyPolicy ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.privacyPolicy,
    tierBonusEnabled: input.tierBonusEnabled ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.tierBonusEnabled,
    visitBadges: (input.visitBadges ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.visitBadges).map(
      (badge: VisitBadge, index: number) => ({
        ...badge,
        name: badge.name.trim() || `Badge ${index + 1}`,
        minVisits: Math.max(1, normalizeNumber(badge.minVisits, 5)),
      })
    ),
  };
}

interface DbLoyaltySettings {
  id: number;
  points_per_dollar: number;
  tiers: LoyaltyTier[] | null;
  rewards: LoyaltyReward[] | null;
  membership_rewards: MembershipReward[] | null;
  member_perks: MemberPerk[] | null;
  terms_and_conditions: string | null;
  privacy_policy: string | null;
  tier_bonus_enabled: boolean | null;
  visit_badges: VisitBadge[] | null;
  updated_at: string;
}

function dbSettingsToLocal(db: DbLoyaltySettings): LoyaltyProgramSettings {
  return {
    pointsPerDollar: db.points_per_dollar,
    tiers: (db.tiers ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.tiers) as LoyaltyTier[],
    rewards: (db.rewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.rewards) as LoyaltyReward[],
    membershipRewards: (db.membership_rewards ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.membershipRewards) as MembershipReward[],
    memberPerks: (db.member_perks ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.memberPerks) as MemberPerk[],
    termsAndConditions: db.terms_and_conditions ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.termsAndConditions,
    privacyPolicy: db.privacy_policy ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.privacyPolicy,
    tierBonusEnabled: db.tier_bonus_enabled ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.tierBonusEnabled,
    visitBadges: (db.visit_badges ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.visitBadges) as VisitBadge[],
  };
}

async function loadFromLocalStorage(): Promise<LoyaltyProgramSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
    return sanitizeSettings(JSON.parse(stored) as LoyaltyProgramSettings);
  } catch {
    return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
  }
}

async function fetchSettings(): Promise<LoyaltyProgramSettings> {
  if (!isSupabaseConfigured()) {
    console.log("[LoyaltyProgram] Supabase not configured, using local storage");
    return loadFromLocalStorage();
  }

  try {
    console.log("[LoyaltyProgram] Fetching settings from Supabase...");
    const { data, error } = await supabase
      .from("loyalty_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.warn("[LoyaltyProgram] Supabase query error:", error.message ?? JSON.stringify(error));
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
    const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn("[LoyaltyProgram] Failed to fetch from Supabase, falling back to local:", errMsg);
    return loadFromLocalStorage();
  }
}

export const [LoyaltyProgramProvider, useLoyaltyProgram] = createContextHook(() => {
  const [settings, setSettings] = useState<LoyaltyProgramSettings>(DEFAULT_LOYALTY_PROGRAM_SETTINGS);

  const settingsQuery = useQuery({
    queryKey: ["loyalty-program-settings"],
    queryFn: fetchSettings,
    refetchInterval: 15000,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: LoyaltyProgramSettings) => {
      const sanitized = sanitizeSettings(nextSettings);

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));

      if (!isSupabaseConfigured()) {
        console.log("[LoyaltyProgram] Supabase not configured, saved to local storage only");
        return sanitized;
      }

      try {
        console.log("[LoyaltyProgram] Saving settings to Supabase...");
        const { error } = await supabase
          .from("loyalty_settings")
          .upsert({
            id: 1,
            points_per_dollar: sanitized.pointsPerDollar,
            tiers: sanitized.tiers as unknown as Record<string, unknown>[],
            rewards: sanitized.rewards as unknown as Record<string, unknown>[],
            membership_rewards: sanitized.membershipRewards as unknown as Record<string, unknown>[],
            member_perks: sanitized.memberPerks as unknown as Record<string, unknown>[],
            terms_and_conditions: sanitized.termsAndConditions,
            privacy_policy: sanitized.privacyPolicy,
            tier_bonus_enabled: sanitized.tierBonusEnabled,
            visit_badges: sanitized.visitBadges as unknown as Record<string, unknown>[],
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.warn("[LoyaltyProgram] Supabase save error:", error.message ?? JSON.stringify(error));
          console.log("[LoyaltyProgram] Already saved to local storage as fallback");
        } else {
          console.log("[LoyaltyProgram] Saved to Supabase");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : JSON.stringify(err);
        console.warn("[LoyaltyProgram] Supabase save failed, using local fallback:", errMsg);
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
