import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { Clock, Flame, Gift, Info, LogOut, Star, User } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View, LayoutAnimation, Platform, UIManager } from "react-native";
import * as Haptics from "expo-haptics";

import { CollapsiblePanel, LoyaltyScreen, RewardCard } from "@/components/loyalty/ui";
import { useAuth } from "@/providers/auth-provider";

import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";
import { useMembersStore } from "@/providers/members-store-provider";
import { ChevronDown, ChevronUp, Lock, Check, Crown, CheckCircle, Clock as ClockIcon } from "lucide-react-native";
import type { MembershipReward } from "@/constants/loyalty-program";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function MemberDashboardScreen() {
  const { settings } = useLoyaltyProgram();
  const { member, logout } = useAuth();
  const { getActivePoints, hasMemberRedeemedReward, hasMemberRedeemedAnyRewardToday } = useMembersStore();

  const points = useMemo<number>(() => {
    if (!member?.id) return 0;
    return getActivePoints(member.id);
  }, [getActivePoints, member?.id]);

  const sortedTiers = useMemo(() => [...settings.tiers].sort((a, b) => a.minPoints - b.minPoints), [settings.tiers]);

  const currentTier = useMemo(() => {
    return sortedTiers.reduce((activeTier, tier) => {
      if (points >= tier.minPoints) {
        return tier;
      }
      return activeTier;
    }, sortedTiers[0]);
  }, [points, sortedTiers]);

  const nextTier = useMemo(() => {
    const currentIndex = sortedTiers.findIndex(t => t.id === currentTier?.id);
    if (currentIndex >= 0 && currentIndex < sortedTiers.length - 1) {
      return sortedTiers[currentIndex + 1];
    }
    return null;
  }, [sortedTiers, currentTier?.id]);

  const tierProgress = useMemo(() => {
    if (!nextTier || !currentTier) return 1;
    const range = nextTier.minPoints - currentTier.minPoints;
    if (range <= 0) return 1;
    const progress = (points - currentTier.minPoints) / range;
    return Math.min(1, Math.max(0, progress));
  }, [points, currentTier, nextTier]);

  return (
    <>
      <Stack.Screen options={{
        title: "Member dashboard",
        headerTransparent: true,
        headerTintColor: "#FFF7ED",
        headerRight: () => (
          <Pressable
            onPress={() => {
              console.log("Opening member profile");
              router.push("/member-profile");
            }}
            style={({ pressed }) => [styles.profileButton, pressed && { opacity: 0.7 }]}
            testID="dashboard-profile-button"
          >
            <User color="#F7C58B" size={20} />
          </Pressable>
        ),
      }} />
      <LoyaltyScreen
        eyebrow={
          member?.fullName ? (
            <View style={styles.welcomeTextWrap}>
              <Text style={styles.welcomeLine1}>Welcome to</Text>
              <Text style={styles.welcomeLine2}>Dae Bak Bon Ga,</Text>
              <Text style={styles.welcomeLine3}>{member.fullName.split(" ")[0]}</Text>
            </View>
          ) : "Member dashboard"
        }
        subtitle=""
        heroContent={
          <View style={styles.logoSection} testID="member-dashboard-logo">
            <View style={styles.logoContainer}>
              <Image contentFit="contain" source={require("@/assets/images/DBBG_LOGO.png")} style={styles.logoImage} />
            </View>
          </View>
        }
        heroRight={
          <View style={styles.badge} testID="member-dashboard-badge">
            <Flame color="#F7C58B" size={18} />
            <Text style={styles.badgeText}>{currentTier?.name ?? "Member"}</Text>
          </View>
        }
      >
        <CollapsiblePanel
          testID="member-points-panel"
          title="Available Points"
          copy="Use points on signature menu items and limited-time member perks."
          icon={Star}
          defaultOpen={true}
        >
          <View style={styles.pointsCard}>
            <Text style={styles.pointsValue}>{formatPoints(points)}</Text>
            <View style={styles.pointsCardRow}>
              <View style={styles.pointsMeta}>
                <Star color="#1A120E" fill="#1A120E" size={16} />
                <Text style={styles.pointsMetaText}>{`Earn ${settings.pointsPerDollar} points per $1 spent`}</Text>
              </View>
            </View>
            {nextTier ? (
              <View style={styles.tierProgressSection}>
                <View style={styles.tierProgressLabels}>
                  <View style={styles.tierProgressLabelLeftHighlight}>
                    <Flame color="#1A120E" size={12} />
                    <Text style={styles.tierProgressCurrentText}>{currentTier?.name}</Text>
                  </View>
                  <Text style={styles.tierProgressPtsText}>
                    {formatPoints(nextTier.minPoints - points)} pts to go
                  </Text>
                  <View style={styles.tierProgressLabelRight}>
                    <Text style={styles.tierProgressNextText}>{nextTier.name}</Text>
                    <Flame color={nextTier.accent} size={12} />
                  </View>
                </View>
                <View style={styles.tierProgressTrack}>
                  <View
                    style={[
                      styles.tierProgressFill,
                      {
                        width: `${Math.max(4, tierProgress * 100)}%`,
                        backgroundColor: nextTier.accent,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.tierProgressSection}>
                <View style={styles.tierMaxBadge}>
                  <Flame color="#1A120E" size={13} />
                  <Text style={styles.tierMaxText}>Max tier reached!</Text>
                </View>
              </View>
            )}
          </View>
          <MemberQRCode memberId={member?.id ?? ""} memberName={member?.fullName ?? ""} />
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-rewards-panel"
          title="Points Rewards"
          copy="Popular rewards for regulars. Ask staff to redeem with your points."
          icon={Gift}
        >
          <View style={styles.redeemNote}>
            <Gift color="#F7C58B" size={16} />
            <Text style={styles.redeemNoteText}>To redeem a reward, show your QR code to staff. They will process the redemption for you.</Text>
          </View>
          {settings.rewards.map((item) => (
            <RewardCard item={item} key={item.id} />
          ))}
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-membership-rewards-panel"
          title="Membership Rewards"
          copy="Exclusive one-time rewards just for being a member. No points needed!"
          icon={Crown}
          iconColor="#34D399"
        >
          <View style={styles.membershipNote}>
            <Crown color="#34D399" size={16} />
            <Text style={styles.membershipNoteText}>These rewards are free for all members. Each can be claimed once by staff when you visit (limit one per day). Show your QR code!</Text>
          </View>
          {member?.id && hasMemberRedeemedAnyRewardToday(member.id) && (
            <View style={styles.dailyLimitNote}>
              <ClockIcon color="#F59E0B" size={14} />
              <Text style={styles.dailyLimitNoteText}>You've already claimed a membership reward today. Come back tomorrow for more!</Text>
            </View>
          )}
          {(settings.membershipRewards ?? []).length > 0 ? (
            (settings.membershipRewards ?? []).map((reward) => (
              <MembershipRewardCard
                key={reward.id}
                reward={reward}
                redeemed={member?.id ? hasMemberRedeemedReward(member.id, reward.id) : false}
                dailyLimitReached={member?.id ? hasMemberRedeemedAnyRewardToday(member.id) : false}
              />
            ))
          ) : (
            <View style={styles.membershipEmpty}>
              <Text style={styles.membershipEmptyText}>No membership rewards available yet. Check back soon!</Text>
            </View>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-actions-panel"
          title="Points Management"
          copy="Points are managed by staff. Show your QR code to earn or redeem."
          icon={Info}
        >
          <View style={styles.staffNote}>
            <Info color="#F7C58B" size={16} />
            <Text style={styles.staffNoteText}>Points are added and redeemed by staff when you visit. Show your QR code and ask staff for assistance!</Text>
          </View>
          <Pressable
            onPress={() => {
              console.log("Member tapped points history");
              router.push("/points-history");
            }}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            testID="member-points-history-button"
          >
            <View style={styles.actionIconWrap}>
              <Clock color="#F7C58B" size={18} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Points history & expiry</Text>
              <Text style={styles.actionSubtitle}>Track earned, used, and expiring points</Text>
            </View>
          </Pressable>
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-tier-panel"
          title="Current Tier"
          copy="Your current status updates automatically when admin changes the loyalty program rules."
          icon={Flame}
          iconColor={currentTier?.accent ?? "#F7C58B"}
        >
          <View style={styles.tierCard}>
            <Text style={styles.tierName}>{currentTier?.name ?? "Member"}</Text>
            <Text style={styles.tierCopy}>{`${formatPoints(points)} points collected so far`}</Text>
          </View>
          <TierRoadmap tiers={settings.tiers} currentPoints={points} currentTierId={currentTier?.id ?? ""} />
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-options-panel"
          title="Member Options"
          copy="Manage your account, view profile, or sign out."
          icon={User}
        >
          <Pressable
            onPress={() => {
              console.log("Member tapped profile");
              router.push("/member-profile");
            }}
            style={({ pressed }) => [styles.actionRow, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            testID="member-profile-button"
          >
            <View style={styles.actionIconWrap}>
              <User color="#F7C58B" size={18} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>My profile</Text>
              <Text style={styles.actionSubtitle}>View and manage your account details</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Log out",
                "Are you sure you want to log out?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Log out",
                    style: "destructive",
                    onPress: async () => {
                      console.log("[Dashboard] Logging out");
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      await logout();
                      router.replace("/");
                    },
                  },
                ],
              );
            }}
            style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            testID="member-logout-button"
          >
            <View style={styles.logoutIconWrap}>
              <LogOut color="#F87171" size={18} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.logoutTitle}>Log out</Text>
              <Text style={styles.actionSubtitle}>Sign out of your account</Text>
            </View>
          </Pressable>
        </CollapsiblePanel>
      </LoyaltyScreen>
    </>
  );
}

function TierRoadmap({ tiers, currentPoints, currentTierId }: { tiers: typeof import("@/constants/loyalty-program").DEFAULT_LOYALTY_PROGRAM_SETTINGS.tiers; currentPoints: number; currentTierId: string }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.minPoints - b.minPoints), [tiers]);
  const currentIndex = useMemo(() => sortedTiers.findIndex(t => t.id === currentTierId), [sortedTiers, currentTierId]);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={styles.tierRoadmapContainer}>
      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.tierRoadmapToggle, pressed && { opacity: 0.8 }]}
        testID="tier-roadmap-toggle"
      >
        <Text style={styles.tierRoadmapToggleText}>View all tiers</Text>
        {expanded ? <ChevronUp color="#F7C58B" size={18} /> : <ChevronDown color="#F7C58B" size={18} />}
      </Pressable>

      {expanded && (
        <View style={styles.tierRoadmapList}>
          {sortedTiers.map((tier, index) => {
            const isCurrentTier = tier.id === currentTierId;
            const isReached = currentPoints >= tier.minPoints;
            const isNext = index === currentIndex + 1;
            const pointsNeeded = tier.minPoints - currentPoints;

            return (
              <View key={tier.id} style={styles.tierRoadmapRow}>
                <View style={styles.tierRoadmapTrack}>
                  <View style={[
                    styles.tierRoadmapDot,
                    { backgroundColor: isReached ? tier.accent : "rgba(255,247,237,0.12)" },
                    isCurrentTier && styles.tierRoadmapDotActive,
                  ]}>
                    {isReached && <Check color="#1A120E" size={12} />}
                    {!isReached && <Lock color="#C8AA94" size={10} />}
                  </View>
                  {index < sortedTiers.length - 1 && (
                    <View style={[
                      styles.tierRoadmapLine,
                      { backgroundColor: isReached && index < currentIndex ? sortedTiers[index + 1]?.accent ?? "#F7C58B" : "rgba(255,247,237,0.08)" },
                    ]} />
                  )}
                </View>
                <View style={[
                  styles.tierRoadmapInfo,
                  isCurrentTier && { borderColor: tier.accent, borderWidth: 1 },
                ]}>
                  <View style={styles.tierRoadmapHeader}>
                    <Text style={[
                      styles.tierRoadmapTierName,
                      isCurrentTier && { color: tier.accent },
                    ]}>{tier.name}</Text>
                    {isCurrentTier && (
                      <View style={[styles.tierRoadmapCurrentBadge, { backgroundColor: tier.accent }]}>
                        <Text style={styles.tierRoadmapCurrentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.tierRoadmapPoints}>
                    {tier.minPoints === 0
                      ? "Starting tier"
                      : isReached
                        ? `Reached at ${formatPoints(tier.minPoints)} pts`
                        : `${formatPoints(pointsNeeded)} more pts needed`}
                  </Text>
                  {isNext && pointsNeeded > 0 && (
                    <View style={styles.tierProgressBarWrap}>
                      <View style={styles.tierProgressBarBg}>
                        <View style={[
                          styles.tierProgressBarFill,
                          {
                            backgroundColor: tier.accent,
                            width: `${Math.min(100, Math.max(5, ((currentPoints - sortedTiers[currentIndex]?.minPoints) / (tier.minPoints - sortedTiers[currentIndex]?.minPoints)) * 100))}%`,
                          },
                        ]} />
                      </View>
                    </View>
                  )}
                  {tier.bonusPoints > 0 && (
                    <Text style={styles.tierRoadmapBonus}>+{tier.bonusPoints} bonus pts on tier-up</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MembershipRewardCard({ reward, redeemed, dailyLimitReached }: { reward: MembershipReward; redeemed: boolean; dailyLimitReached: boolean }) {
  return (
    <View style={[styles.membershipCard, redeemed && styles.membershipCardRedeemed]} testID={`membership-reward-${reward.id}`}>
      <View style={[styles.membershipAccent, { backgroundColor: redeemed ? "#6B7280" : reward.accent }]} />
      <View style={styles.membershipBody}>
        <Text style={[styles.membershipTitle, redeemed && styles.membershipTitleRedeemed]}>{reward.title}</Text>
        <Text style={styles.membershipSubtitle}>{reward.subtitle}</Text>
      </View>
      {redeemed ? (
        <View style={styles.membershipRedeemedBadge}>
          <CheckCircle color="#6B7280" size={16} />
          <Text style={styles.membershipRedeemedText}>Claimed</Text>
        </View>
      ) : dailyLimitReached ? (
        <View style={styles.membershipDailyLimitBadge}>
          <ClockIcon color="#F59E0B" size={14} />
          <Text style={styles.membershipDailyLimitText}>Tomorrow</Text>
        </View>
      ) : (
        <View style={styles.membershipAvailableBadge}>
          <Crown color="#34D399" size={14} />
          <Text style={styles.membershipAvailableText}>Available</Text>
        </View>
      )}
    </View>
  );
}

function MemberQRCode({ memberId, memberName }: { memberId: string; memberName: string }) {
  const qrData = `dbbg-member:${memberId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}&bgcolor=1A120E&color=F7C58B&margin=8`;

  return (
    <View style={styles.qrContainer} testID="member-qr-code">
      <View style={styles.qrImageWrap}>
        <Image
          source={{ uri: qrUrl }}
          style={styles.qrImage}
          contentFit="contain"
          testID="member-qr-image"
        />
      </View>
      <Text style={styles.qrName}>{memberName}</Text>
      <Text style={styles.qrHint}>Staff will scan this to look up your account</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileButton: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  badge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  badgeText: {
    color: "#F8E7D0",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  pointsCard: {
    backgroundColor: "#F7C58B",
    borderRadius: 24,
    gap: 14,
    padding: 20,
  },
  pointsCardRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pointsMeta: {
    alignItems: "center",
    backgroundColor: "rgba(26, 18, 14, 0.08)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointsTierBadge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pointsTierBadgeText: {
    color: "#1A120E",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  tierProgressSection: {
    gap: 8,
    marginTop: 2,
  },
  tierProgressLabels: {
    alignItems: "center",
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  tierProgressLabelLeft: {
    alignItems: "center",
    flexDirection: "row" as const,
    gap: 4,
  },
  tierProgressLabelLeftHighlight: {
    alignItems: "center",
    backgroundColor: "rgba(26, 18, 14, 0.15)",
    borderColor: "rgba(26, 18, 14, 0.2)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tierProgressLabelRight: {
    alignItems: "center",
    flexDirection: "row" as const,
    gap: 4,
  },
  tierProgressCurrentText: {
    color: "#1A120E",
    fontSize: 12,
    fontWeight: "900" as const,
    letterSpacing: 0.3,
  },
  tierProgressNextText: {
    color: "#1A120E",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  tierProgressPtsText: {
    color: "rgba(26, 18, 14, 0.55)",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  tierProgressTrack: {
    backgroundColor: "rgba(26, 18, 14, 0.12)",
    borderRadius: 6,
    height: 8,
    overflow: "hidden" as const,
    width: "100%",
  },
  tierProgressFill: {
    borderRadius: 6,
    height: 8,
  },
  tierMaxBadge: {
    alignItems: "center",
    alignSelf: "flex-start" as const,
    backgroundColor: "rgba(26, 18, 14, 0.1)",
    borderRadius: 999,
    flexDirection: "row" as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tierMaxText: {
    color: "#1A120E",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  pointsMetaText: {
    color: "#1A120E",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  pointsValue: {
    color: "#1A120E",
    fontSize: 42,
    fontWeight: "900" as const,
  },
  tierCard: {
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  tierCopy: {
    color: "#C8AA94",
    fontSize: 14,
  },
  tierName: {
    color: "#FFF7ED",
    fontSize: 22,
    fontWeight: "900" as const,
  },
  staffNote: {
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
  staffNoteText: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  redeemNote: {
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
  redeemNoteText: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  actionRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  actionIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  actionTextWrap: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  actionSubtitle: {
    color: "#C8AA94",
    fontSize: 12,
  },
  logoutRow: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.06)",
    borderColor: "rgba(248, 113, 113, 0.15)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  logoutIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.1)",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  logoutTitle: {
    color: "#FCA5A5",
    fontSize: 15,
    fontWeight: "800" as const,
  },

  qrContainer: {
    alignItems: "center",
    gap: 12,
  },
  qrImageWrap: {
    alignItems: "center",
    backgroundColor: "#1A120E",
    borderColor: "rgba(247, 197, 139, 0.3)",
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: "center",
    overflow: "hidden",
    padding: 12,
  },
  qrImage: {
    height: 200,
    width: 200,
  },
  qrName: {
    color: "#FFF7ED",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  qrHint: {
    color: "#C8AA94",
    fontSize: 13,
    textAlign: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 4,
  },
  logoContainer: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 24,
    height: 96,
    justifyContent: "center",
    overflow: "hidden",
    padding: 10,
    width: 96,
  },
  logoImage: {
    height: 76,
    width: 76,
  },

  tierRoadmapContainer: {
    gap: 12,
  },
  tierRoadmapToggle: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tierRoadmapToggleText: {
    color: "#F7C58B",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  tierRoadmapList: {
    gap: 0,
  },
  tierRoadmapRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
  },
  tierRoadmapTrack: {
    alignItems: "center",
    width: 28,
  },
  tierRoadmapDot: {
    alignItems: "center",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    width: 28,
    zIndex: 1,
  },
  tierRoadmapDotActive: {
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
  },
  tierRoadmapLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
  tierRoadmapInfo: {
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    marginBottom: 8,
    padding: 12,
  },
  tierRoadmapHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  tierRoadmapTierName: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  tierRoadmapCurrentBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierRoadmapCurrentBadgeText: {
    color: "#1A120E",
    fontSize: 10,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
  },
  tierRoadmapPoints: {
    color: "#C8AA94",
    fontSize: 13,
  },
  tierProgressBarWrap: {
    marginTop: 2,
  },
  tierProgressBarBg: {
    backgroundColor: "rgba(255, 247, 237, 0.08)",
    borderRadius: 4,
    height: 6,
    overflow: "hidden" as const,
    width: "100%",
  },
  tierProgressBarFill: {
    borderRadius: 4,
    height: 6,
  },
  tierRoadmapBonus: {
    color: "#F7C58B",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  welcomeTextWrap: {
    gap: 2,
  },
  welcomeLine1: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  welcomeLine2: {
    color: "#F7C58B",
    fontSize: 22,
    fontWeight: "900" as const,
  },
  welcomeLine3: {
    color: "#FFF7ED",
    fontSize: 20,
    fontWeight: "800" as const,
  },
  membershipNote: {
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
  membershipNoteText: {
    color: "#A7C4B5",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  membershipCard: {
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.04)",
    borderColor: "rgba(52, 211, 153, 0.14)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  membershipCardRedeemed: {
    backgroundColor: "rgba(107, 114, 128, 0.04)",
    borderColor: "rgba(107, 114, 128, 0.14)",
    opacity: 0.7,
  },
  membershipAccent: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  membershipBody: {
    flex: 1,
    gap: 4,
  },
  membershipTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  membershipTitleRedeemed: {
    color: "#9CA3AF",
  },
  membershipSubtitle: {
    color: "#C9AD99",
    fontSize: 13,
    lineHeight: 18,
  },
  membershipRedeemedBadge: {
    alignItems: "center",
    backgroundColor: "rgba(107, 114, 128, 0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  membershipRedeemedText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  membershipAvailableBadge: {
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  membershipAvailableText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  membershipEmpty: {
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.04)",
    borderColor: "rgba(52, 211, 153, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  membershipEmptyText: {
    color: "#A7C4B5",
    fontSize: 13,
    fontWeight: "600" as const,
    textAlign: "center" as const,
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
  membershipDailyLimitBadge: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  membershipDailyLimitText: {
    color: "#F59E0B",
    fontSize: 12,
    fontWeight: "700" as const,
  },
});
