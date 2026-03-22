import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, router } from "expo-router";
import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  CircleDollarSign,
  Clock,
  Crown,
  Edit3,
  Flame,
  Gift,
  Minus,
  Phone,
  Save,
  ShieldCheck,
  Star,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ActionButton,
  CollapsiblePanel,
  InputField,
  LoyaltyScreen,
} from "@/components/loyalty/ui";

import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";
import { useMembersStore, type StoredMember } from "@/providers/members-store-provider";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMemberStats(member: StoredMember) {
  const earned = member.pointsHistory.filter((e) => e.type === "earned");
  const redeemed = member.pointsHistory.filter((e) => e.type === "redeemed");
  const totalEarned = earned.reduce((s, e) => s + e.amount, 0);
  const totalRedeemed = redeemed.reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalSpent = earned.reduce((s, e) => s + e.dollarAmount, 0);
  const visitCount = earned.length;

  let lastVisit: string | null = null;
  if (earned.length > 0) {
    const sorted = [...earned].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    lastVisit = sorted[0].addedAt;
  }

  return { visitCount, totalEarned, totalRedeemed, totalSpent, lastVisit, earnedCount: earned.length, redeemedCount: redeemed.length };
}

export default function AdminMemberDetailScreen() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { getMemberById, addPoints, removePoints, getActivePoints, updateMemberProfile, deleteMember, hasMemberRedeemedReward, hasMemberRedeemedAnyRewardToday, redeemMembershipReward } = useMembersStore();
  const { settings } = useLoyaltyProgram();

  const [dollarAmount, setDollarAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [removeMode, setRemoveMode] = useState<boolean>(false);
  const [removeAmount, setRemoveAmount] = useState<string>("");
  const [removeNote, setRemoveNote] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editBirthMonth, setEditBirthMonth] = useState<string>("");
  const [editBirthDay, setEditBirthDay] = useState<string>("");
  const [editBirthYear, setEditBirthYear] = useState<string>("");

  const foundMember = useMemo<StoredMember | null>(() => {
    if (!memberId) return null;
    return getMemberById(memberId) ?? null;
  }, [memberId, getMemberById]);

  const activePoints = useMemo<number>(() => {
    if (!foundMember) return 0;
    return getActivePoints(foundMember.id);
  }, [foundMember, getActivePoints]);

  const currentTier = useMemo(() => {
    if (!foundMember) return null;
    const sorted = [...settings.tiers].sort((a, b) => a.minPoints - b.minPoints);
    return sorted.reduce((active, tier) => {
      if (activePoints >= tier.minPoints) return tier;
      return active;
    }, sorted[0]);
  }, [activePoints, foundMember, settings.tiers]);

  const stats = useMemo(() => {
    if (!foundMember) return null;
    return getMemberStats(foundMember);
  }, [foundMember]);

  const calculatedPoints = useMemo<number>(() => {
    const dollars = parseFloat(dollarAmount);
    if (!dollars || dollars <= 0) return 0;
    return Math.round(dollars * settings.pointsPerDollar);
  }, [dollarAmount, settings.pointsPerDollar]);

  const redeemableRewards = useMemo(() => {
    return settings.rewards.map((reward) => ({
      ...reward,
      canRedeem: activePoints >= reward.points,
    }));
  }, [activePoints, settings.rewards]);

  const handleDeleteMember = useCallback(() => {
    if (!foundMember) return;
    Alert.alert(
      "Delete member account",
      `Are you sure you want to permanently delete ${foundMember.fullName}'s account?\n\nThis action cannot be undone. All points and history will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              `Type-confirm: Permanently delete ${foundMember.fullName}?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: () => {
                    deleteMember(foundMember.id);
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    Alert.alert("Deleted", `${foundMember.fullName}'s account has been permanently deleted.`);
                    router.back();
                    console.log("[MemberDetail] Deleted member", foundMember.id);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [deleteMember, foundMember]);

  const handleStartEdit = useCallback(() => {
    if (!foundMember) return;
    const bdParts = foundMember.birthdate ? foundMember.birthdate.split("/") : ["", ""];
    setEditName(foundMember.fullName);
    setEditPhone(foundMember.phone);
    setEditBirthMonth(bdParts[0] ?? "");
    setEditBirthDay(bdParts[1] ?? "");
    setEditBirthYear(foundMember.birthYear ?? "");
    setEditMode(true);
    console.log("[MemberDetail] Started editing member profile", foundMember.id);
  }, [foundMember]);

  const handleSaveEdit = useCallback(() => {
    if (!foundMember) return;
    if (!editName.trim()) {
      Alert.alert("Invalid name", "Please enter the member's full name.");
      return;
    }
    const phoneDigits = editPhone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit phone number.");
      return;
    }
    const month = parseInt(editBirthMonth, 10);
    const day = parseInt(editBirthDay, 10);
    const year = parseInt(editBirthYear, 10);
    if (!month || month < 1 || month > 12 || !day || day < 1 || day > 31 || !year || year < 1900 || year > new Date().getFullYear()) {
      Alert.alert("Invalid birthday", "Please enter a valid birthday (month, day, and year).");
      return;
    }

    const birthdate = `${editBirthMonth.padStart(2, "0")}/${editBirthDay.padStart(2, "0")}`;
    const birthYear = editBirthYear;

    Alert.alert(
      "Confirm changes",
      `Save profile changes for ${foundMember.fullName}?\n\nName: ${editName.trim()}\nPhone: ${editPhone}\nBirthday: ${birthdate}/${birthYear}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            updateMemberProfile(foundMember.id, {
              fullName: editName.trim(),
              phone: editPhone,
              birthdate,
              birthYear,
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditMode(false);
            Alert.alert("Updated", "Member profile has been updated successfully.");
            console.log("[MemberDetail] Saved profile edits for member", foundMember.id);
          },
        },
      ],
    );
  }, [editBirthDay, editBirthMonth, editBirthYear, editName, editPhone, foundMember, updateMemberProfile]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    console.log("[MemberDetail] Cancelled editing");
  }, []);

  const handleAddPoints = useCallback(() => {
    if (!foundMember) return;
    const dollars = parseFloat(dollarAmount);
    if (!dollars || dollars <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid sub-total amount.");
      return;
    }

    const pointsToAdd = Math.round(dollars * settings.pointsPerDollar);

    Alert.alert(
      "Confirm points",
      `Add ${formatPoints(pointsToAdd)} points to ${foundMember.fullName}?\n\nSub-total: $${dollars.toFixed(2)}\nRate: ${settings.pointsPerDollar} pts per $1\nPoints: ${formatPoints(pointsToAdd)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          style: "default",
          onPress: () => {
            const pointsAdded = addPoints(foundMember.id, dollars, settings.pointsPerDollar, note.trim() || "Staff transaction", {
              tiers: settings.tiers,
              tierBonusEnabled: settings.tierBonusEnabled,
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Points added",
              `${formatPoints(pointsAdded)} points added to ${foundMember.fullName}'s account.`,
            );
            setDollarAmount("");
            setNote("");
            console.log("[MemberDetail] Added points for member", foundMember.id);
          },
        },
      ],
    );
  }, [addPoints, dollarAmount, foundMember, note, settings.pointsPerDollar, settings.tiers, settings.tierBonusEnabled]);

  const handleRemovePoints = useCallback(() => {
    if (!foundMember) return;
    const amount = parseInt(removeAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid number of points to remove.");
      return;
    }

    if (amount > activePoints) {
      Alert.alert("Insufficient points", `${foundMember.fullName} only has ${formatPoints(activePoints)} active points.`);
      return;
    }

    Alert.alert(
      "Confirm removal",
      `Remove ${formatPoints(amount)} points from ${foundMember.fullName}?\n\nReason: ${removeNote.trim() || "Staff correction"}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removePoints(foundMember.id, amount, removeNote.trim() || "Staff correction");
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              "Points removed",
              `${formatPoints(amount)} points removed from ${foundMember.fullName}'s account.`,
            );
            setRemoveAmount("");
            setRemoveNote("");
            setRemoveMode(false);
            console.log("[MemberDetail] Removed points for member", foundMember.id);
          },
        },
      ],
    );
  }, [activePoints, foundMember, removeAmount, removeNote, removePoints]);

  const dailyLimitReached = useMemo(() => {
    if (!foundMember) return false;
    return hasMemberRedeemedAnyRewardToday(foundMember.id);
  }, [foundMember, hasMemberRedeemedAnyRewardToday]);

  const handleClaimMembershipReward = useCallback((rewardId: string, rewardTitle: string) => {
    if (!foundMember) return;

    if (hasMemberRedeemedReward(foundMember.id, rewardId)) {
      Alert.alert("Already Claimed", `${foundMember.fullName} has already claimed "${rewardTitle}".`);
      return;
    }

    if (hasMemberRedeemedAnyRewardToday(foundMember.id)) {
      Alert.alert("Daily Limit Reached", `${foundMember.fullName} has already claimed a membership reward today. Only one membership reward can be claimed per day.`);
      return;
    }

    Alert.alert(
      "Confirm claim",
      `Claim "${rewardTitle}" for ${foundMember.fullName}?\n\nThis is a one-time membership reward — no points will be deducted. This will also count as a visit.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim",
          onPress: () => {
            const result = redeemMembershipReward(foundMember.id, rewardId);
            if (result === "success") {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Claimed!", `"${rewardTitle}" has been claimed for ${foundMember.fullName}. Visit recorded.`);
              console.log("[MemberDetail] Claimed membership reward", rewardTitle, "for member", foundMember.id);
            } else if (result === "daily_limit") {
              Alert.alert("Daily Limit Reached", "Only one membership reward can be claimed per day.");
            } else {
              Alert.alert("Already Claimed", "This reward has already been claimed.");
            }
          },
        },
      ],
    );
  }, [foundMember, hasMemberRedeemedReward, hasMemberRedeemedAnyRewardToday, redeemMembershipReward]);

  const handleRedeemReward = useCallback((rewardId: string, rewardTitle: string, rewardPoints: number) => {
    if (!foundMember) return;

    if (activePoints < rewardPoints) {
      Alert.alert(
        "Insufficient points",
        `${foundMember.fullName} needs ${formatPoints(rewardPoints)} points but only has ${formatPoints(activePoints)} active points.`,
      );
      return;
    }

    Alert.alert(
      "Confirm redemption",
      `Redeem "${rewardTitle}" for ${foundMember.fullName}?\n\n${formatPoints(rewardPoints)} points will be deducted.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Redeem",
          style: "default",
          onPress: () => {
            removePoints(foundMember.id, rewardPoints, `Redeemed: ${rewardTitle}`);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Reward redeemed!",
              `"${rewardTitle}" has been redeemed for ${foundMember.fullName}. ${formatPoints(rewardPoints)} points deducted.`,
            );
            console.log("[MemberDetail] Redeemed reward", rewardTitle, "for member", foundMember.id);
          },
        },
      ],
    );
  }, [activePoints, foundMember, removePoints]);

  if (!foundMember || !stats) {
    return (
      <>
        <Stack.Screen options={{ title: "Member Detail", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
        <LoyaltyScreen
          eyebrow="Staff tools"
          subtitle="Member not found. They may have been deleted."
          title="Not found."
          heroRight={
            <View style={styles.iconBadge} testID="member-detail-badge">
              <User color="#F7C58B" size={20} />
            </View>
          }
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.8 }]}
            testID="member-detail-back"
          >
            <ChevronLeft color="#F7C58B" size={18} />
            <Text style={styles.backButtonText}>Back to search</Text>
          </Pressable>
        </LoyaltyScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: foundMember.fullName, headerTransparent: true, headerTintColor: "#FFF7ED" }} />

      <LoyaltyScreen
        eyebrow="Member detail"
        subtitle={`Manage ${foundMember.fullName}'s account, points, and rewards.`}
        title={foundMember.fullName}
        heroRight={
          <View style={styles.heroPointsBadge}>
            <Star color="#F7C58B" size={16} />
            <Text style={styles.heroPointsText}>{formatPoints(activePoints)}</Text>
            <Text style={styles.heroPointsLabel}>pts</Text>
          </View>
        }
      >
        <CollapsiblePanel
          testID="detail-member-info-panel"
          title="Member info"
          copy="Profile details and account information."
          icon={User}
          defaultOpen={true}
        >
          <View style={styles.memberCard}>
            <View style={styles.memberAvatar}>
              <User color="#F7C58B" size={22} />
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{foundMember.fullName}</Text>
              {currentTier && (
                <View style={styles.tierBadge}>
                  <View style={[styles.tierDot, { backgroundColor: currentTier.accent }]} />
                  <Text style={styles.tierBadgeText}>{currentTier.name}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Phone color="#F7C58B" size={14} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{foundMember.phone}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Flame color="#F7C58B" size={14} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Tier</Text>
                <Text style={[styles.infoValue, { color: currentTier?.accent ?? "#F7C58B" }]}>
                  {currentTier?.name ?? "Member"}
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Star color="#F7C58B" size={14} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Active Points</Text>
                <Text style={styles.infoValueLarge}>{formatPoints(activePoints)}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Calendar color="#F7C58B" size={14} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{formatDate(foundMember.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Calendar color="#F7C58B" size={14} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Birthday</Text>
                <Text style={styles.infoValue}>
                  {foundMember.birthdate ? `${foundMember.birthdate}/${foundMember.birthYear}` : "Not set"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <TrendingUp color="#22C55E" size={18} />
              <Text style={styles.statValue}>{stats.visitCount}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </View>
            <View style={styles.statCard}>
              <Star color="#F7C58B" size={18} />
              <Text style={styles.statValue}>{formatPoints(stats.totalEarned)}</Text>
              <Text style={styles.statLabel}>Earned</Text>
            </View>
            <View style={styles.statCard}>
              <CircleDollarSign color="#F87171" size={18} />
              <Text style={styles.statValue}>{formatPoints(stats.totalRedeemed)}</Text>
              <Text style={styles.statLabel}>Redeemed</Text>
            </View>
            <View style={styles.statCard}>
              <CircleDollarSign color="#60A5FA" size={18} />
              <Text style={styles.statValue}>${stats.totalSpent.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total spent</Text>
            </View>
          </View>

          {stats.lastVisit && (
            <View style={styles.lastVisitRow}>
              <Clock color="#C8AA94" size={14} />
              <Text style={styles.lastVisitText}>Last visit: {formatDateTime(stats.lastVisit)}</Text>
            </View>
          )}

          {stats.visitCount >= 5 && (
            <View style={styles.regularBadge}>
              <Flame color="#F59E0B" size={16} />
              <Text style={styles.regularBadgeText}>
                {stats.visitCount >= 20 ? "VIP Regular" : stats.visitCount >= 10 ? "Frequent Visitor" : "Regular Customer"}
              </Text>
            </View>
          )}
        </CollapsiblePanel>

        {foundMember.pointsHistory.length > 0 && (
          <CollapsiblePanel
            testID="detail-history-panel"
            title="Points history"
            copy={`${foundMember.pointsHistory.length} transaction${foundMember.pointsHistory.length !== 1 ? "s" : ""} — ${stats.earnedCount} earned, ${stats.redeemedCount} redeemed.`}
            icon={Clock}
          >
            {foundMember.pointsHistory.slice(0, 10).map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <View style={[styles.historyDot, entry.type === "redeemed" ? styles.historyDotRedeemed : undefined]} />
                <View style={styles.historyContent}>
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyAmount}>
                      {entry.type === "redeemed" ? "−" : "+"}{formatPoints(Math.abs(entry.amount))} pts
                    </Text>
                    {entry.type === "earned" && (
                      <Text style={styles.historySpent}>${entry.dollarAmount.toFixed(2)}</Text>
                    )}
                  </View>
                  <Text style={styles.historyNote}>{entry.note}</Text>
                  <Text style={styles.historyDate}>{formatDateTime(entry.addedAt)}</Text>
                  {entry.type === "earned" && entry.expiresAt && (
                    <Text style={styles.historyExpiry}>
                      Expires: {formatDate(entry.expiresAt)}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </CollapsiblePanel>
        )}

        <CollapsiblePanel
          testID="detail-add-points-panel"
          title="Add points"
          copy={`Enter the sub-total (without tax & tips). Points auto-calculated at ${settings.pointsPerDollar} pts per $1.`}
          icon={Star}
        >
          <InputField
            label="Sub-total amount ($) — exclude tax & tips"
            keyboardType="numeric"
            onChangeText={(v) => setDollarAmount(v.replace(/[^0-9.]/g, ""))}
            placeholder="45.50"
            testID="detail-dollar-input"
            value={dollarAmount}
          />
          <InputField
            label="Note (optional)"
            onChangeText={setNote}
            placeholder="e.g. Table 5 dinner"
            testID="detail-note-input"
            value={note}
          />

          {calculatedPoints > 0 && (
            <View style={styles.previewRow}>
              <CircleDollarSign color="#F7C58B" size={16} />
              <Text style={styles.previewText}>
                ${parseFloat(dollarAmount).toFixed(2)} × {settings.pointsPerDollar} = {formatPoints(calculatedPoints)} points
              </Text>
            </View>
          )}

          <ActionButton
            icon={Star}
            label={calculatedPoints > 0 ? `Add ${formatPoints(calculatedPoints)} points` : "Add points to member"}
            onPress={handleAddPoints}
            testID="detail-add-points-button"
            variant="primary"
          />
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="detail-redeem-rewards-panel"
          title="Redeem rewards"
          copy={`Member has ${formatPoints(activePoints)} active points. Select a reward to redeem.`}
          icon={Gift}
          iconColor="#F59E0B"
        >
          <View style={styles.redeemPointsBadge}>
            <Star color="#F7C58B" size={16} />
            <Text style={styles.redeemPointsText}>{formatPoints(activePoints)} points available</Text>
          </View>

          {redeemableRewards.map((reward) => (
            <View key={reward.id}>
              <View style={styles.redeemRewardCard}>
                <View style={[styles.redeemAccent, { backgroundColor: reward.accent }]} />
                <View style={styles.redeemBody}>
                  <Text style={styles.redeemTitle}>{reward.title}</Text>
                  <Text style={styles.redeemSubtitle}>{reward.subtitle}</Text>
                  <Text style={styles.redeemCost}>{formatPoints(reward.points)} pts required</Text>
                </View>
                <Pressable
                  onPress={() => handleRedeemReward(reward.id, reward.title, reward.points)}
                  style={({ pressed }) => [
                    reward.canRedeem ? styles.redeemButton : styles.redeemButtonDisabled,
                    pressed && reward.canRedeem && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                  ]}
                  disabled={!reward.canRedeem}
                  testID={`detail-redeem-${reward.id}`}
                >
                  <Gift color={reward.canRedeem ? "#1A120E" : "#8E6D56"} size={14} />
                  <Text style={reward.canRedeem ? styles.redeemButtonText : styles.redeemButtonTextDisabled}>
                    Redeem
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </CollapsiblePanel>

        {settings.membershipRewards.length > 0 && (
          <CollapsiblePanel
            testID="detail-membership-rewards-panel"
            title="Membership rewards"
            copy={`Claim one-time membership rewards for ${foundMember.fullName}. No points needed.`}
            icon={Crown}
            iconColor="#34D399"
          >
            <View style={styles.membershipInfoBanner}>
              <Crown color="#34D399" size={16} />
              <Text style={styles.membershipInfoText}>Each membership reward can only be claimed once per member, and only one per day. Tap "Claim" to process.</Text>
            </View>
            {dailyLimitReached && (
              <View style={styles.dailyLimitBanner}>
                <Clock color="#F59E0B" size={16} />
                <Text style={styles.dailyLimitText}>{foundMember.fullName} has already claimed a membership reward today. Come back tomorrow!</Text>
              </View>
            )}
            {settings.membershipRewards.map((reward) => {
              const alreadyClaimed = hasMemberRedeemedReward(foundMember.id, reward.id);
              return (
                <View key={reward.id} style={[styles.membershipRewardCard, alreadyClaimed && styles.membershipRewardCardClaimed]} testID={`detail-membership-${reward.id}`}>
                  <View style={[styles.membershipRewardAccent, { backgroundColor: alreadyClaimed ? "#6B7280" : reward.accent }]} />
                  <View style={styles.membershipRewardBody}>
                    <Text style={[styles.membershipRewardTitle, alreadyClaimed && styles.membershipRewardTitleClaimed]}>{reward.title}</Text>
                    <Text style={styles.membershipRewardSubtitle}>{reward.subtitle}</Text>
                  </View>
                  {alreadyClaimed ? (
                    <View style={styles.membershipClaimedBadge}>
                      <CheckCircle color="#6B7280" size={14} />
                      <Text style={styles.membershipClaimedText}>Claimed</Text>
                    </View>
                  ) : dailyLimitReached ? (
                    <View style={styles.membershipDailyLimitBadge}>
                      <Clock color="#F59E0B" size={14} />
                      <Text style={styles.membershipDailyLimitText}>Tomorrow</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => handleClaimMembershipReward(reward.id, reward.title)}
                      style={({ pressed }) => [styles.membershipClaimBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
                      testID={`detail-membership-claim-${reward.id}`}
                    >
                      <Crown color="#1A120E" size={14} />
                      <Text style={styles.membershipClaimBtnText}>Claim</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </CollapsiblePanel>
        )}

        <CollapsiblePanel
          testID="detail-remove-points-panel"
          title="Remove points"
          copy="Remove points in case of a mistake or correction."
          icon={Minus}
          iconColor="#F87171"
        >
          {!removeMode ? (
            <Pressable
              onPress={() => setRemoveMode(true)}
              style={({ pressed }) => [styles.removeToggleButton, pressed && { opacity: 0.8 }]}
              testID="detail-remove-toggle-button"
            >
              <Minus color="#F87171" size={18} />
              <Text style={styles.removeToggleText}>Remove points from member</Text>
            </Pressable>
          ) : (
            <>
              <InputField
                label="Points to remove"
                keyboardType="numeric"
                onChangeText={(v) => setRemoveAmount(v.replace(/[^0-9]/g, ""))}
                placeholder="100"
                testID="detail-remove-amount-input"
                value={removeAmount}
              />
              <InputField
                label="Reason (optional)"
                onChangeText={setRemoveNote}
                placeholder="e.g. Incorrect amount entered"
                testID="detail-remove-note-input"
                value={removeNote}
              />

              {removeAmount && parseInt(removeAmount, 10) > 0 && (
                <View style={styles.removePreviewRow}>
                  <Minus color="#F87171" size={16} />
                  <Text style={styles.removePreviewText}>
                    Removing {formatPoints(parseInt(removeAmount, 10))} points from {foundMember.fullName}
                  </Text>
                </View>
              )}

              <View style={styles.removeActions}>
                <Pressable
                  onPress={() => {
                    setRemoveMode(false);
                    setRemoveAmount("");
                    setRemoveNote("");
                  }}
                  style={({ pressed }) => [styles.removeCancelButton, pressed && { opacity: 0.7 }]}
                  testID="detail-remove-cancel-button"
                >
                  <X color="#C8AA94" size={16} />
                  <Text style={styles.removeCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleRemovePoints}
                  style={({ pressed }) => [styles.removeConfirmButton, pressed && { opacity: 0.8 }]}
                  testID="detail-remove-confirm-button"
                >
                  <Minus color="#FFF" size={16} />
                  <Text style={styles.removeConfirmText}>Remove Points</Text>
                </Pressable>
              </View>
            </>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="detail-edit-profile-panel"
          title="Edit member profile"
          copy="Edit this member's profile information including name, contact details, and birthday."
          icon={Edit3}
          iconColor="#60A5FA"
        >
          {!editMode ? (
            <Pressable
              onPress={handleStartEdit}
              style={({ pressed }) => [styles.editToggleButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
              testID="detail-edit-profile-button"
            >
              <View style={styles.editToggleIconWrap}>
                <Edit3 color="#60A5FA" size={20} />
              </View>
              <View style={styles.editToggleTextWrap}>
                <Text style={styles.editToggleTitle}>Edit Profile</Text>
                <Text style={styles.editToggleSubtitle}>Change name, contact info, or birthday</Text>
              </View>
            </Pressable>
          ) : (
            <>
              <InputField
                label="Full name"
                onChangeText={setEditName}
                placeholder="John Doe"
                testID="detail-edit-name-input"
                value={editName}
              />
              <InputField
                label="Phone number"
                keyboardType="phone-pad"
                onChangeText={(v) => setEditPhone(formatPhone(v))}
                placeholder="555-123-4567"
                testID="detail-edit-phone-input"
                value={editPhone}
              />
              <Text style={styles.editFieldLabel}>Birthday</Text>
              <View style={styles.birthdayRow}>
                <View style={styles.birthdayField}>
                  <InputField
                    label="Month"
                    keyboardType="numeric"
                    onChangeText={(v) => setEditBirthMonth(v.replace(/\D/g, "").slice(0, 2))}
                    placeholder="MM"
                    testID="detail-edit-birth-month"
                    value={editBirthMonth}
                  />
                </View>
                <View style={styles.birthdayField}>
                  <InputField
                    label="Day"
                    keyboardType="numeric"
                    onChangeText={(v) => setEditBirthDay(v.replace(/\D/g, "").slice(0, 2))}
                    placeholder="DD"
                    testID="detail-edit-birth-day"
                    value={editBirthDay}
                  />
                </View>
                <View style={styles.birthdayField}>
                  <InputField
                    label="Year"
                    keyboardType="numeric"
                    onChangeText={(v) => setEditBirthYear(v.replace(/\D/g, "").slice(0, 4))}
                    placeholder="YYYY"
                    testID="detail-edit-birth-year"
                    value={editBirthYear}
                  />
                </View>
              </View>

              <View style={styles.editIdNote}>
                <ShieldCheck color="#F59E0B" size={16} />
                <Text style={styles.editIdNoteText}>
                  Verify member's real government-issued ID before changing birthday
                </Text>
              </View>

              <View style={styles.editActions}>
                <Pressable
                  onPress={handleCancelEdit}
                  style={({ pressed }) => [styles.editCancelButton, pressed && { opacity: 0.7 }]}
                  testID="detail-edit-cancel-button"
                >
                  <X color="#C8AA94" size={16} />
                  <Text style={styles.editCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  style={({ pressed }) => [styles.editSaveButton, pressed && { opacity: 0.8 }]}
                  testID="detail-edit-save-button"
                >
                  <Save color="#1A120E" size={16} />
                  <Text style={styles.editSaveText}>Save Changes</Text>
                </Pressable>
              </View>
            </>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="detail-delete-member-panel"
          title="Delete member"
          copy="Permanently delete this member's account. This action cannot be undone."
          icon={Trash2}
          iconColor="#EF4444"
        >
          <View style={styles.deleteWarningBanner}>
            <Trash2 color="#F87171" size={18} />
            <Text style={styles.deleteWarningText}>
              Deleting this account will permanently remove all of {foundMember.fullName}'s data including points balance, transaction history, and profile information.
            </Text>
          </View>
          <Pressable
            onPress={handleDeleteMember}
            style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            testID="detail-delete-member-button"
          >
            <Trash2 color="#FFF" size={16} />
            <Text style={styles.deleteButtonText}>Delete {foundMember.fullName}'s Account</Text>
          </Pressable>
        </CollapsiblePanel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
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
  backButton: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButtonText: {
    color: "#F7C58B",
    fontSize: 15,
    fontWeight: "700" as const,
  },
  heroPointsBadge: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroPointsText: {
    color: "#F7C58B",
    fontSize: 20,
    fontWeight: "900" as const,
  },
  heroPointsLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  memberAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  memberCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "800" as const,
  },
  tierBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierBadgeText: {
    color: "#F8E7D0",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  tierDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  infoGrid: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  infoContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  infoValue: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  infoValueLarge: {
    color: "#F7C58B",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  infoDivider: {
    backgroundColor: "rgba(247, 197, 139, 0.06)",
    height: 1,
    marginHorizontal: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  statValue: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  statLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  lastVisitRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lastVisitText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  regularBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  regularBadgeText: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  previewRow: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewText: {
    color: "#F8E7D0",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  editToggleButton: {
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.06)",
    borderColor: "rgba(96, 165, 250, 0.2)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  editToggleIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  editToggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  editToggleTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  editToggleSubtitle: {
    color: "#C8AA94",
    fontSize: 12,
  },
  editFieldLabel: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: 4,
  },
  birthdayRow: {
    flexDirection: "row",
    gap: 10,
  },
  birthdayField: {
    flex: 1,
  },
  editIdNote: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editIdNoteText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  editCancelButton: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editCancelText: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  editSaveButton: {
    alignItems: "center",
    backgroundColor: "#60A5FA",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editSaveText: {
    color: "#1A120E",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  redeemPointsBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  redeemPointsText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  redeemRewardCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  redeemAccent: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  redeemBody: {
    flex: 1,
    gap: 3,
  },
  redeemTitle: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  redeemSubtitle: {
    color: "#C9AD99",
    fontSize: 12,
    lineHeight: 16,
  },
  redeemCost: {
    color: "#F7C58B",
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  redeemButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  redeemButtonDisabled: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  redeemButtonText: {
    color: "#1A120E",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  redeemButtonTextDisabled: {
    color: "#8E6D56",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  removeToggleButton: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.06)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  removeToggleText: {
    color: "#F87171",
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  removePreviewRow: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removePreviewText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  removeActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  removeCancelButton: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  removeCancelText: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  removeConfirmButton: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  removeConfirmText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  deleteWarningBanner: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  deleteWarningText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  membershipInfoBanner: {
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
  membershipInfoText: {
    color: "#A7C4B5",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  membershipRewardCard: {
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.04)",
    borderColor: "rgba(52, 211, 153, 0.14)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  membershipRewardCardClaimed: {
    backgroundColor: "rgba(107, 114, 128, 0.04)",
    borderColor: "rgba(107, 114, 128, 0.14)",
    opacity: 0.7,
  },
  membershipRewardAccent: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  membershipRewardBody: {
    flex: 1,
    gap: 3,
  },
  membershipRewardTitle: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  membershipRewardTitleClaimed: {
    color: "#9CA3AF",
  },
  membershipRewardSubtitle: {
    color: "#C9AD99",
    fontSize: 12,
    lineHeight: 16,
  },
  membershipClaimedBadge: {
    alignItems: "center",
    backgroundColor: "rgba(107, 114, 128, 0.12)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  membershipClaimedText: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  membershipClaimBtn: {
    alignItems: "center",
    backgroundColor: "#34D399",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  membershipClaimBtnText: {
    color: "#1A120E",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  historyAmount: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyDate: {
    color: "#8E6D56",
    fontSize: 12,
  },
  historyExpiry: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  historyDot: {
    backgroundColor: "#22C55E",
    borderRadius: 999,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  historyDotRedeemed: {
    backgroundColor: "#F87171",
  },
  historyNote: {
    color: "#C8AA94",
    fontSize: 13,
  },
  historyRow: {
    flexDirection: "row",
    gap: 12,
  },
  historyTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  historySpent: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  dailyLimitBanner: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dailyLimitText: {
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
