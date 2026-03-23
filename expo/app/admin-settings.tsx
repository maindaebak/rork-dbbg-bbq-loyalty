import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import {
  ChevronRight,
  CircleDollarSign,
  Crown,
  FileText,
  Flame,
  Gift,
  Layers,
  RotateCcw,
  Shield,
  Sparkles,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import React, { useCallback } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  ActionButton,
  LoyaltyScreen,
  Panel,
} from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

interface SettingsLinkProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  description: string;
  route: string;
  testID: string;
}

function SettingsLink({ icon: Icon, iconColor, title, description, route, testID }: SettingsLinkProps) {
  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  }, [route]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.linkCard, pressed && styles.linkCardPressed]}
      testID={testID}
    >
      <View style={[styles.linkIconWrap, { backgroundColor: `${iconColor}15` }]}>
        <Icon color={iconColor} size={20} />
      </View>
      <View style={styles.linkTextWrap}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkDescription} numberOfLines={2}>{description}</Text>
      </View>
      <ChevronRight color="#8E6D56" size={18} />
    </Pressable>
  );
}

export default function AdminSettingsScreen() {
  const { resetSettings } = useLoyaltyProgram();

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

  return (
    <>
      <Stack.Screen options={{ title: "Loyalty Settings", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Program config"
        subtitle="Manage your loyalty program. Tap any section below to configure."
        title="Loyalty settings."
        heroRight={
          <View style={styles.iconBadge} testID="admin-settings-badge">
            <CircleDollarSign color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="admin-settings-earning-panel">
          <Text style={styles.groupLabel}>Earning & Tiers</Text>
          <SettingsLink
            icon={CircleDollarSign}
            iconColor="#F7C58B"
            title="Points Per Dollar"
            description="How many points members earn for each dollar spent"
            route="/settings-points"
            testID="admin-link-points"
          />
          <SettingsLink
            icon={Layers}
            iconColor="#FB7185"
            title="Membership Tiers"
            description="Define tiers, thresholds, and bonus rewards"
            route="/settings-tiers"
            testID="admin-link-tiers"
          />
        </Panel>

        <Panel testID="admin-settings-rewards-panel">
          <Text style={styles.groupLabel}>Rewards & Perks</Text>
          <SettingsLink
            icon={Gift}
            iconColor="#F7C58B"
            title="Rewards"
            description="Redeemable rewards and required points"
            route="/settings-rewards"
            testID="admin-link-rewards"
          />
          <SettingsLink
            icon={Crown}
            iconColor="#34D399"
            title="Membership Rewards"
            description="One-time rewards for members, no points needed"
            route="/settings-membership-rewards"
            testID="admin-link-membership-rewards"
          />
          <SettingsLink
            icon={Sparkles}
            iconColor="#FBBF24"
            title="Member-Only Perks"
            description="Exclusive deals and special offers for members"
            route="/settings-member-perks"
            testID="admin-link-member-perks"
          />
        </Panel>

        <Panel testID="admin-settings-engagement-panel">
          <Text style={styles.groupLabel}>Engagement</Text>
          <SettingsLink
            icon={Flame}
            iconColor="#F59E0B"
            title="Visit Badges"
            description="Badges based on visit count milestones"
            route="/settings-visit-badges"
            testID="admin-link-visit-badges"
          />
        </Panel>

        <Panel testID="admin-settings-legal-panel">
          <Text style={styles.groupLabel}>Legal</Text>
          <SettingsLink
            icon={Shield}
            iconColor="#60A5FA"
            title="Privacy Policy"
            description="Edit privacy policy visible to members"
            route="/settings-privacy"
            testID="admin-link-privacy"
          />
          <SettingsLink
            icon={FileText}
            iconColor="#A78BFA"
            title="Terms & Conditions"
            description="Edit terms members agree to when signing up"
            route="/settings-terms"
            testID="admin-link-terms"
          />
        </Panel>

        <Panel testID="admin-settings-danger-panel">
          <ActionButton
            icon={RotateCcw}
            label="Reset all to defaults"
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
  groupLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
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
  linkCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  linkCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  linkDescription: {
    color: "#8E6D56",
    fontSize: 12,
    lineHeight: 17,
  },
  linkIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  linkTextWrap: {
    flex: 1,
    gap: 3,
  },
  linkTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
