import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LOYALTY_PROGRAM_SETTINGS,
  type LoyaltyProgramSettings,
  type LoyaltyReward,
  type LoyaltyTier,
} from "@/constants/loyalty-program";

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
    })),
    rewards: input.rewards.map((reward: LoyaltyReward, index: number) => ({
      ...reward,
      title: reward.title.trim() || `Reward ${index + 1}`,
      subtitle: reward.subtitle.trim() || "Member redemption reward",
      points: Math.max(0, normalizeNumber(reward.points, 0)),
    })),
    termsAndConditions: input.termsAndConditions ?? DEFAULT_LOYALTY_PROGRAM_SETTINGS.termsAndConditions,
  };
}

async function fetchStoredSettings(): Promise<LoyaltyProgramSettings> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);

  if (!stored) {
    console.log("No stored loyalty settings found, using defaults");
    return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
  }

  try {
    const parsed = JSON.parse(stored) as LoyaltyProgramSettings;
    console.log("Loaded loyalty settings from AsyncStorage");
    return sanitizeSettings(parsed);
  } catch (error) {
    console.log("Failed to parse loyalty settings, falling back to defaults", error);
    return DEFAULT_LOYALTY_PROGRAM_SETTINGS;
  }
}

export const [LoyaltyProgramProvider, useLoyaltyProgram] = createContextHook(() => {
  const [settings, setSettings] = useState<LoyaltyProgramSettings>(DEFAULT_LOYALTY_PROGRAM_SETTINGS);

  const settingsQuery = useQuery({
    queryKey: ["loyalty-program-settings"],
    queryFn: fetchStoredSettings,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextSettings: LoyaltyProgramSettings) => {
      const sanitized = sanitizeSettings(nextSettings);
      console.log("Saving loyalty settings", sanitized);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
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
