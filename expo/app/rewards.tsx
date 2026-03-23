import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { Gift, Star, ChevronRight } from "lucide-react-native";
import React, { useMemo } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "@/providers/auth-provider";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";
import { useMembersStore } from "@/providers/members-store-provider";

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function RewardsScreen() {
  const { settings } = useLoyaltyProgram();
  const { member } = useAuth();
  const { getActivePoints } = useMembersStore();

  const points = useMemo<number>(() => {
    if (!member?.id) return 0;
    return getActivePoints(member.id);
  }, [getActivePoints, member?.id]);

  const sortedRewards = useMemo(
    () => [...settings.rewards].sort((a, b) => a.points - b.points),
    [settings.rewards],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Redeem Rewards",
          headerStyle: { backgroundColor: "#120A08" },
          headerTintColor: "#FFF7ED",
          headerBackTitle: "Back",
        }}
      />
      <LinearGradient colors={["#120A08", "#24110B", "#090909"]} style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            testID="rewards-screen"
          >
            <View style={styles.pointsSummary}>
              <View style={styles.pointsSummaryIcon}>
                <Star color="#1A120E" fill="#1A120E" size={20} />
              </View>
              <View style={styles.pointsSummaryText}>
                <Text style={styles.pointsSummaryLabel}>Your Points</Text>
                <Text style={styles.pointsSummaryValue}>{formatPoints(points)}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Gift color="#F7C58B" size={16} />
              <Text style={styles.infoText}>
                Show your QR code to staff to redeem any reward below. Points will be deducted from your balance.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Available Rewards</Text>

            {sortedRewards.map((reward) => {
              const canRedeem = points >= reward.points;
              return (
                <View
                  key={reward.id}
                  style={[styles.rewardCard, !canRedeem && styles.rewardCardLocked]}
                  testID={`reward-${reward.id}`}
                >
                  <View style={styles.rewardLeft}>
                    <View style={[styles.rewardAccentDot, { backgroundColor: reward.accent }]} />
                    <View style={styles.rewardInfo}>
                      <Text style={[styles.rewardTitle, !canRedeem && styles.rewardTitleLocked]}>
                        {reward.title}
                      </Text>
                      <Text style={styles.rewardSubtitle}>{reward.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.rewardRight}>
                    <View style={[styles.pointsBadge, canRedeem ? styles.pointsBadgeActive : styles.pointsBadgeInactive]}>
                      <Gift color={canRedeem ? "#1A120E" : "#8E6D56"} size={14} />
                      <Text style={[styles.pointsBadgeText, canRedeem ? styles.pointsBadgeTextActive : styles.pointsBadgeTextInactive]}>
                        {formatPoints(reward.points)} pts
                      </Text>
                    </View>
                    {canRedeem ? (
                      <View style={styles.redeemableBadge}>
                        <Text style={styles.redeemableText}>Redeemable</Text>
                        <ChevronRight color="#34D399" size={14} />
                      </View>
                    ) : (
                      <Text style={styles.needMoreText}>
                        {formatPoints(reward.points - points)} more pts
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            {sortedRewards.length === 0 && (
              <View style={styles.emptyState}>
                <Gift color="#C8AA94" size={32} />
                <Text style={styles.emptyText}>No rewards available yet.</Text>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Rewards are subject to availability. Staff will process the redemption when you visit.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  pointsSummary: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 22,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  pointsSummaryIcon: {
    alignItems: "center",
    backgroundColor: "rgba(26, 18, 14, 0.1)",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pointsSummaryText: {
    flex: 1,
    gap: 2,
  },
  pointsSummaryLabel: {
    color: "rgba(26, 18, 14, 0.6)",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  pointsSummaryValue: {
    color: "#1A120E",
    fontSize: 28,
    fontWeight: "900" as const,
  },
  infoCard: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: {
    color: "#F7C58B",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
    lineHeight: 18,
  },
  sectionLabel: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 1,
    marginTop: 4,
    textTransform: "uppercase" as const,
  },
  rewardCard: {
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  rewardCardLocked: {
    opacity: 0.6,
  },
  rewardLeft: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  rewardAccentDot: {
    borderRadius: 999,
    height: 10,
    marginTop: 5,
    width: 10,
  },
  rewardInfo: {
    flex: 1,
    gap: 4,
  },
  rewardTitle: {
    color: "#FFF7ED",
    fontSize: 17,
    fontWeight: "800" as const,
  },
  rewardTitleLocked: {
    color: "#C8AA94",
  },
  rewardSubtitle: {
    color: "#A0866F",
    fontSize: 13,
    lineHeight: 18,
  },
  rewardRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  pointsBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointsBadgeActive: {
    backgroundColor: "#F7C58B",
  },
  pointsBadgeInactive: {
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderWidth: 1,
  },
  pointsBadgeText: {
    fontSize: 13,
    fontWeight: "800" as const,
  },
  pointsBadgeTextActive: {
    color: "#1A120E",
  },
  pointsBadgeTextInactive: {
    color: "#8E6D56",
  },
  redeemableBadge: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
  },
  redeemableText: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  needMoreText: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    color: "#C8AA94",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  footer: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  footerText: {
    color: "#8E6D56",
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center" as const,
  },
});
