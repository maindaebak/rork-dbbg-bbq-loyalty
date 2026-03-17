import { Image } from "expo-image";
import { Stack, router } from "expo-router";
import { CheckCircle, Clock, Flame, Gift, Info, LogOut, Mail, QrCode, Star, User, XCircle } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CollapsiblePanel, LoyaltyScreen, RewardCard } from "@/components/loyalty/ui";
import { useAuth } from "@/providers/auth-provider";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";
import { useMembersStore } from "@/providers/members-store-provider";

function EmailVerificationBanner({ verified, onVerify }: { verified: boolean; onVerify: () => void }) {
  return (
    <View style={verified ? bannerStyles.verified : bannerStyles.unverified} testID="email-verification-banner">
      <View style={bannerStyles.row}>
        {verified ? (
          <CheckCircle color="#22C55E" size={18} />
        ) : (
          <XCircle color="#F87171" size={18} />
        )}
        <Text style={verified ? bannerStyles.verifiedText : bannerStyles.unverifiedText}>
          {verified ? "Email address verified" : "Email not verified"}
        </Text>
        {!verified && (
          <Pressable
            onPress={onVerify}
            style={({ pressed }) => [bannerStyles.verifyButton, pressed && { opacity: 0.7 }]}
            testID="verify-email-button"
          >
            <Mail color="#1A120E" size={13} />
            <Text style={bannerStyles.verifyButtonText}>Verify now</Text>
          </Pressable>
        )}
      </View>
      {!verified && (
        <Text style={bannerStyles.hintText}>
          You can still earn points, but you need to verify your email to redeem them.
        </Text>
      )}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  verified: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  unverified: {
    backgroundColor: "rgba(248, 113, 113, 0.06)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  verifiedText: {
    color: "#86EFAC",
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  unverifiedText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  verifyButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  verifyButtonText: {
    color: "#1A120E",
    fontSize: 12,
    fontWeight: "800" as const,
  },
  hintText: {
    color: "#C8AA94",
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 26,
  },
});

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export default function MemberDashboardScreen() {
  const { settings } = useLoyaltyProgram();
  const { member, logout, verifyEmail } = useAuth();
  const { getActivePoints, setEmailVerified } = useMembersStore();

  const isEmailVerified = member?.emailVerified ?? false;

  const handleVerifyEmail = useCallback(() => {
    Alert.alert(
      "Verify your email",
      `A new confirmation email has been sent to ${member?.email ?? "your email"}. For this demo, tap "Confirm" to simulate verification.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            console.log("[Dashboard] Verifying email for member", member?.id);
            verifyEmail();
            if (member?.id) {
              setEmailVerified(member.id, true);
            }
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Email verified", "Your email has been verified. You can now redeem your points!");
          },
        },
      ],
    );
  }, [member?.email, member?.id, setEmailVerified, verifyEmail]);

  const points = useMemo<number>(() => {
    if (!member?.id) return 0;
    return getActivePoints(member.id);
  }, [getActivePoints, member?.id]);

  const currentTier = useMemo(() => {
    const sortedTiers = [...settings.tiers].sort((left, right) => left.minPoints - right.minPoints);
    return sortedTiers.reduce((activeTier, tier) => {
      if (points >= tier.minPoints) {
        return tier;
      }

      return activeTier;
    }, sortedTiers[0]);
  }, [points, settings.tiers]);

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
        eyebrow={member?.fullName ? `Welcome, ${member.fullName.split(" ")[0]}` : "Member dashboard"}
        subtitle="See your live tier, point balance, and redeemable rewards based on the latest admin settings."
        title="Your grill-night rewards."
        heroRight={
          <View style={styles.badge} testID="member-dashboard-badge">
            <Flame color="#F7C58B" size={18} />
            <Text style={styles.badgeText}>{currentTier?.name ?? "Member"}</Text>
          </View>
        }
      >
        <CollapsiblePanel
          testID="member-points-panel"
          title="Available points"
          copy="Use points on signature menu items and limited-time member perks."
          icon={Star}
          defaultOpen={true}
        >
          <View style={styles.pointsCard}>
            <Text style={styles.pointsValue}>{formatPoints(points)}</Text>
            <View style={styles.pointsMeta}>
              <Star color="#1A120E" fill="#1A120E" size={16} />
              <Text style={styles.pointsMetaText}>{`Earn ${settings.pointsPerDollar} points per $1 spent`}</Text>
            </View>
          </View>
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-tier-panel"
          title="Current tier"
          copy="Your current status updates automatically when admin changes the loyalty program rules."
          icon={Flame}
          iconColor={currentTier?.accent ?? "#F7C58B"}
        >
          <View style={styles.tierCard}>
            <Text style={styles.tierName}>{currentTier?.name ?? "Member"}</Text>
            <Text style={styles.tierCopy}>{`${formatPoints(points)} points collected so far`}</Text>
          </View>
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="member-qr-panel"
          title="Your member QR code"
          copy="Show this QR code to staff for quick point lookup."
          icon={QrCode}
        >
          <EmailVerificationBanner verified={isEmailVerified} onVerify={handleVerifyEmail} />
          <MemberQRCode memberId={member?.id ?? ""} memberName={member?.fullName ?? ""} />
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
          testID="member-rewards-panel"
          title="Featured rewards"
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
          testID="member-options-panel"
          title="Member options"
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
                    onPress: () => {
                      console.log("[Dashboard] Logging out");
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                      logout();
                      router.replace("/welcome");
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

function MemberQRCode({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [showQR, setShowQR] = useState<boolean>(false);
  const qrData = `dbbg-member:${memberId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}&bgcolor=1A120E&color=F7C58B&margin=8`;

  if (!showQR) {
    return (
      <Pressable
        onPress={() => setShowQR(true)}
        style={({ pressed }) => [styles.showQrButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
        testID="member-show-qr-button"
      >
        <QrCode color="#1A120E" size={20} />
        <Text style={styles.showQrText}>Tap to reveal your QR code</Text>
      </Pressable>
    );
  }

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
      <Pressable
        onPress={() => setShowQR(false)}
        style={({ pressed }) => [styles.hideQrButton, pressed && { opacity: 0.7 }]}
        testID="member-hide-qr-button"
      >
        <Text style={styles.hideQrText}>Hide QR code</Text>
      </Pressable>
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
  pointsMeta: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(26, 18, 14, 0.08)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
  showQrButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 20,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  showQrText: {
    color: "#1A120E",
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
  hideQrButton: {
    paddingVertical: 6,
  },
  hideQrText: {
    color: "#F7C58B",
    fontSize: 13,
    fontWeight: "700" as const,
  },
});
