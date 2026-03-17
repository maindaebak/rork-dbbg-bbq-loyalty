import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import {
  ChevronRight,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react-native";
import React, { useCallback, useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { LoyaltyScreen, Panel, SectionTitle } from "@/components/loyalty/ui";
import { useAdminAuth } from "@/providers/admin-auth-provider";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";
import { useMembersStore } from "@/providers/members-store-provider";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function AdminDashboardScreen() {
  const { logout } = useAdminAuth();
  const { members } = useMembersStore();
  const { settings } = useLoyaltyProgram();

  const stats = useMemo(() => {
    const totalMembers = members.length;
    const totalPoints = members.reduce((sum, m) => sum + m.points, 0);
    const avgPoints = totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0;
    return { totalMembers, totalPoints, avgPoints };
  }, [members]);

  const handleLogout = useCallback(() => {
    Alert.alert("Log out", "Are you sure you want to log out of the staff portal?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          console.log("[AdminDashboard] Logging out");
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          logout();
          router.replace("/welcome");
        },
      },
    ]);
  }, [logout]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "Staff Dashboard",
          headerTransparent: true,
          headerTintColor: "#FFF7ED",
          headerLeft: () => null,
          headerRight: () => (
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
              testID="admin-logout-button"
            >
              <LogOut color="#F7C58B" size={18} />
            </Pressable>
          ),
        }}
      />
      <LoyaltyScreen
        eyebrow="Dae Bak Bon Ga"
        subtitle="Manage members, add points, and configure the loyalty program."
        title="Staff dashboard."
        heroRight={
          <View style={styles.logoBadge} testID="admin-logo">
            <Image
              contentFit="contain"
              source={require("@/assets/images/DBBG_LOGO.png")}
              style={styles.logoImage}
            />
          </View>
        }
      >
        <Panel testID="admin-stats-panel">
          <SectionTitle copy="Current loyalty program overview." title="Program stats" />
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Users color="#F7C58B" size={20} />
              <Text style={styles.statValue}>{formatNumber(stats.totalMembers)}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <Text style={styles.statValue}>{formatNumber(stats.totalPoints)}</Text>
              <Text style={styles.statLabel}>Total pts</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>⭐</Text>
              <Text style={styles.statValue}>{formatNumber(stats.avgPoints)}</Text>
              <Text style={styles.statLabel}>Avg pts</Text>
            </View>
          </View>
        </Panel>

        <Panel testID="admin-actions-panel">
          <SectionTitle copy="Quick access to staff tools." title="Staff tools" />

          <Pressable
            onPress={() => {
              console.log("[AdminDashboard] Opening member search");
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/admin-members");
            }}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            testID="admin-go-members"
          >
            <View style={styles.actionIcon}>
              <Search color="#F7C58B" size={18} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Search members</Text>
              <Text style={styles.actionCaption}>Find by phone & add points</Text>
            </View>
            <ChevronRight color="#C8AA94" size={18} />
          </Pressable>

          <Pressable
            onPress={() => {
              console.log("[AdminDashboard] Opening settings");
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/admin-settings");
            }}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            testID="admin-go-settings"
          >
            <View style={styles.actionIcon}>
              <Settings color="#F7C58B" size={18} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Loyalty settings</Text>
              <Text style={styles.actionCaption}>Tiers, rewards, points per $</Text>
            </View>
            <ChevronRight color="#C8AA94" size={18} />
          </Pressable>
        </Panel>

        <Panel testID="admin-program-panel">
          <SectionTitle copy="Current program configuration." title="Active config" />
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Points per $1</Text>
            <View style={styles.configPill}>
              <Text style={styles.configValue}>{settings.pointsPerDollar}</Text>
            </View>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Tiers</Text>
            <View style={styles.configPill}>
              <Text style={styles.configValue}>{settings.tiers.length}</Text>
            </View>
          </View>
          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Rewards</Text>
            <View style={styles.configPill}>
              <Text style={styles.configValue}>{settings.rewards.length}</Text>
            </View>
          </View>
        </Panel>

        <Panel testID="admin-info-panel">
          <View style={styles.infoRow}>
            <ShieldCheck color="#F7C58B" size={16} />
            <Text style={styles.infoText}>Logged in as staff administrator</Text>
          </View>
        </Panel>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
          testID="admin-logout-bottom-button"
        >
          <LogOut color="#E8634A" size={18} />
          <Text style={styles.logoutText}>Log out of staff portal</Text>
        </Pressable>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  actionCaption: {
    color: "#C8AA94",
    fontSize: 13,
  },
  actionContent: {
    flex: 1,
    gap: 3,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  actionRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  configLabel: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  configPill: {
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  configRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  configValue: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  infoText: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  logoBadge: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    padding: 6,
    width: 56,
  },
  logoImage: {
    height: 44,
    width: 44,
  },
  logoutBtn: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  statEmoji: {
    fontSize: 18,
  },
  statLabel: {
    color: "#C8AA94",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  statValue: {
    color: "#FFF7ED",
    fontSize: 20,
    fontWeight: "900" as const,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  logoutRow: {
    alignItems: "center",
    backgroundColor: "rgba(232, 99, 74, 0.08)",
    borderColor: "rgba(232, 99, 74, 0.2)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: {
    color: "#E8634A",
    fontSize: 15,
    fontWeight: "700" as const,
  },
});
