import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { Crown, Lock, Flame, CheckCircle, Clock as ClockIcon } from "lucide-react-native";
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

export default function MembershipRewardsScreen() {
  const { settings } = useLoyaltyProgram();
  const { member } = useAuth();
  const { getActivePoints, hasMemberRedeemedReward, hasMemberRedeemedAnyRewardToday } = useMembersStore();

  const points = useMemo<number>(() => {
    if (!member?.id) return 0;
    return getActivePoints(member.id);
  }, [getActivePoints, member?.id]);

  const sortedTiers = useMemo(() => [...settings.tiers].sort((a, b) => a.minPoints - b.minPoints), [settings.tiers]);

  const currentTier = useMemo(() => {
    let active = sortedTiers[0];
    for (const tier of sortedTiers) {
      if (points >= tier.minPoints) {
        active = tier;
      } else {
        break;
      }
    }
    return active;
  }, [points, sortedTiers]);

  const currentTierIndex = useMemo(() => sortedTiers.findIndex(t => t.id === currentTier?.id), [sortedTiers, currentTier?.id]);

  const dailyLimitReached = useMemo(() => {
    if (!member?.id) return false;
    return hasMemberRedeemedAnyRewardToday(member.id);
  }, [member?.id, hasMemberRedeemedAnyRewardToday]);

  const membershipRewards = settings.membershipRewards ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Membership Rewards",
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
            testID="membership-rewards-screen"
          >
            <View style={styles.tierSummary}>
              <View style={styles.tierSummaryIcon}>
                <Flame color="#1A120E" fill="#1A120E" size={20} />
              </View>
              <View style={styles.tierSummaryText}>
                <Text style={styles.tierSummaryLabel}>Your Tier</Text>
                <Text style={styles.tierSummaryValue}>{currentTier?.name ?? "Member"}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Crown color="#34D399" size={16} />
              <Text style={styles.infoText}>
                These rewards are free for members. Each can be claimed once by staff when you visit. Show your QR code!
              </Text>
            </View>

            {dailyLimitReached && (
              <View style={styles.dailyLimitNote}>
                <ClockIcon color="#F59E0B" size={14} />
                <Text style={styles.dailyLimitNoteText}>You've already claimed a membership reward today. Come back tomorrow for more!</Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>All Membership Rewards</Text>

            {membershipRewards.length > 0 ? (
              membershipRewards.map((reward) => {
                const requiredTiers = reward.requiredTiers ?? [];
                const lowestRequiredTierIndex = requiredTiers.length > 0
                  ? Math.min(...requiredTiers.map(tid => {
                      const idx = sortedTiers.findIndex(t => t.id === tid);
                      return idx >= 0 ? idx : Infinity;
                    }))
                  : -1;
                const isUnlocked = requiredTiers.length === 0 || (currentTierIndex >= 0 && currentTierIndex >= lowestRequiredTierIndex);
                const requiredTierNames = requiredTiers
                  .map((tid) => settings.tiers.find((t) => t.id === tid)?.name)
                  .filter(Boolean) as string[];
                const lowestRequiredTier = requiredTiers.length > 0
                  ? sortedTiers.find((t) => requiredTiers.includes(t.id))
                  : null;
                const redeemed = member?.id ? hasMemberRedeemedReward(member.id, reward.id) : false;

                console.log(`[MembershipRewards] Reward "${reward.title}" | isUnlocked: ${isUnlocked} | redeemed: ${redeemed}`);

                if (!isUnlocked) {
                  return (
                    <View key={reward.id} style={[styles.rewardCard, styles.rewardCardLocked]} testID={`membership-reward-${reward.id}-locked`}>
                      <View style={styles.rewardHeader}>
                        <View style={[styles.accentDot, { backgroundColor: "#5A4A3F" }]} />
                        <View style={styles.rewardInfo}>
                          <Text style={styles.rewardTitleLocked}>{reward.title}</Text>
                          <Text style={styles.rewardSubtitleLocked}>{reward.subtitle}</Text>
                          <View style={styles.lockedTierRow}>
                            <Lock color="#8E6D56" size={11} />
                            <Text style={styles.lockedTierText}>
                              {lowestRequiredTier?.name
                                ? `Reach ${lowestRequiredTier.name} to unlock`
                                : requiredTierNames.length > 0
                                  ? `${requiredTierNames.join(" / ")} only`
                                  : "Restricted"}
                            </Text>
                          </View>
                          {lowestRequiredTier?.accent && (
                            <View style={[styles.lockedTierHintBadge, { backgroundColor: `${lowestRequiredTier.accent}15`, borderColor: `${lowestRequiredTier.accent}30` }]}>
                              <Flame color={lowestRequiredTier.accent} size={11} />
                              <Text style={[styles.lockedTierHintText, { color: lowestRequiredTier.accent }]}>
                                {requiredTierNames.length > 0 ? requiredTierNames.join(" / ") : lowestRequiredTier.name}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.lockedBadge}>
                        <Lock color="#8E6D56" size={14} />
                        <Text style={styles.lockedBadgeText}>Locked</Text>
                      </View>
                    </View>
                  );
                }

                return (
                  <View
                    key={reward.id}
                    style={[styles.rewardCard, redeemed && styles.rewardCardRedeemed]}
                    testID={`membership-reward-${reward.id}`}
                  >
                    <View style={styles.rewardHeader}>
                      <View style={[styles.accentDot, { backgroundColor: redeemed ? "#6B7280" : reward.accent }]} />
                      <View style={styles.rewardInfo}>
                        <Text style={[styles.rewardTitle, redeemed && styles.rewardTitleRedeemed]}>{reward.title}</Text>
                        <Text style={styles.rewardSubtitle}>{reward.subtitle}</Text>
                      </View>
                    </View>
                    {redeemed ? (
                      <View style={styles.claimedBadge}>
                        <CheckCircle color="#6B7280" size={16} />
                        <Text style={styles.claimedText}>Claimed</Text>
                      </View>
                    ) : dailyLimitReached ? (
                      <View style={styles.tomorrowBadge}>
                        <ClockIcon color="#F59E0B" size={14} />
                        <Text style={styles.tomorrowText}>Tomorrow</Text>
                      </View>
                    ) : (
                      <View style={styles.availableBadge}>
                        <Crown color="#34D399" size={14} />
                        <Text style={styles.availableText}>Available</Text>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Crown color="#C8AA94" size={32} />
                <Text style={styles.emptyText}>No membership rewards available yet.</Text>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Membership rewards are one-time claims. Limit one membership reward per day. Staff will process the claim when you visit.
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
    gap: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tierSummary: {
    alignItems: "center",
    backgroundColor: "#34D399",
    borderRadius: 22,
    flexDirection: "row",
    gap: 14,
    padding: 18,
  },
  tierSummaryIcon: {
    alignItems: "center",
    backgroundColor: "rgba(26, 18, 14, 0.1)",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  tierSummaryText: {
    flex: 1,
    gap: 2,
  },
  tierSummaryLabel: {
    color: "rgba(26, 18, 14, 0.6)",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  tierSummaryValue: {
    color: "#1A120E",
    fontSize: 28,
    fontWeight: "900" as const,
  },
  infoCard: {
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.06)",
    borderColor: "rgba(52, 211, 153, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoText: {
    color: "#A7C4B5",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
    lineHeight: 18,
  },
  dailyLimitNote: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderColor: "rgba(245, 158, 11, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dailyLimitNoteText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
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
    backgroundColor: "rgba(52, 211, 153, 0.04)",
    borderColor: "rgba(52, 211, 153, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  rewardCardLocked: {
    backgroundColor: "rgba(90, 74, 63, 0.06)",
    borderColor: "rgba(90, 74, 63, 0.18)",
    opacity: 0.75,
  },
  rewardCardRedeemed: {
    backgroundColor: "rgba(107, 114, 128, 0.04)",
    borderColor: "rgba(107, 114, 128, 0.14)",
    opacity: 0.7,
  },
  rewardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
  },
  accentDot: {
    borderRadius: 999,
    height: 12,
    marginTop: 4,
    width: 12,
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
  rewardTitleRedeemed: {
    color: "#9CA3AF",
  },
  rewardTitleLocked: {
    color: "#8E6D56",
    fontSize: 17,
    fontWeight: "800" as const,
  },
  rewardSubtitle: {
    color: "#C9AD99",
    fontSize: 13,
    lineHeight: 18,
  },
  rewardSubtitleLocked: {
    color: "#6B5A4E",
    fontSize: 13,
    lineHeight: 18,
  },
  lockedTierRow: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    gap: 4,
    marginTop: 2,
  },
  lockedTierText: {
    color: "#8E6D56",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  lockedTierHintBadge: {
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lockedTierHintText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  lockedBadge: {
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(90, 74, 63, 0.15)",
    borderRadius: 999,
    flexDirection: "row" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lockedBadgeText: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  claimedBadge: {
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(107, 114, 128, 0.12)",
    borderRadius: 999,
    flexDirection: "row" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  claimedText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  availableBadge: {
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderRadius: 999,
    flexDirection: "row" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  availableText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  tomorrowBadge: {
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 999,
    flexDirection: "row" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tomorrowText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700" as const,
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
