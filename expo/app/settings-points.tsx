import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { CircleDollarSign, Save } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import {
  ActionButton,
  InputField,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

export default function SettingsPointsScreen() {
  const { settings, updateSettings, isSaving } = useLoyaltyProgram();
  const [pointsPerDollar, setPointsPerDollar] = useState<string>(String(settings.pointsPerDollar));

  useEffect(() => {
    setPointsPerDollar(String(settings.pointsPerDollar));
  }, [settings.pointsPerDollar]);

  const handleSave = useCallback(() => {
    const ppd = parseInt(pointsPerDollar, 10);
    if (!ppd || ppd <= 0) {
      Alert.alert("Invalid value", "Points per dollar must be a positive number.");
      return;
    }
    console.log("[SettingsPoints] Saving pointsPerDollar:", ppd);
    updateSettings({ ...settings, pointsPerDollar: ppd });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", "Points per dollar has been updated.");
  }, [pointsPerDollar, settings, updateSettings]);

  return (
    <>
      <Stack.Screen options={{ title: "Points Per Dollar", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Earning rate"
        subtitle="Configure how many points members earn for each dollar spent."
        title="Points per dollar."
        heroRight={
          <CircleDollarSign color="#F7C58B" size={28} />
        }
      >
        <Panel testID="settings-ppd-panel">
          <SectionTitle
            copy="How many points members earn for each dollar spent."
            title="Points per $1"
          />
          <InputField
            label="Points per $1"
            keyboardType="numeric"
            onChangeText={(v) => setPointsPerDollar(v.replace(/\D/g, ""))}
            placeholder="8"
            testID="settings-ppd-input"
            value={pointsPerDollar}
          />
        </Panel>

        <Panel testID="settings-ppd-save-panel">
          <ActionButton
            icon={Save}
            label={isSaving ? "Saving..." : "Save changes"}
            onPress={handleSave}
            testID="settings-ppd-save"
            variant="primary"
          />
        </Panel>
      </LoyaltyScreen>
    </>
  );
}
