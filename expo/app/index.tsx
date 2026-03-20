import { Stack, router, Redirect } from "expo-router";
import { Image } from "expo-image";
import { Flame, Star, UserRound } from "lucide-react-native";
import React, { useCallback, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ActionButton, LoyaltyScreen, Panel, SectionTitle } from "@/components/loyalty/ui";
import { useAdminAuth } from "@/providers/admin-auth-provider";
import { useAuth } from "@/providers/auth-provider";

export default function IndexScreen() {
  const { isReady, isLoggedIn } = useAuth();
  const { isAdminLoggedIn } = useAdminAuth();
  const tapCountRef = useRef<number>(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoPress = useCallback(() => {
    tapCountRef.current += 1;
    console.log("[Welcome] Logo tap count:", tapCountRef.current);

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      console.log("[Welcome] Opening admin portal");
      if (isAdminLoggedIn) {
        router.push("/admin-dashboard");
      } else {
        router.push("/admin-login");
      }
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 1500);
  }, [isAdminLoggedIn]);

  if (!isReady) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loader}>
          <ActivityIndicator color="#F7C58B" size="large" />
        </View>
      </>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/member-dashboard" />;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LoyaltyScreen
        eyebrow="Dae Bak Bon Ga Korean Restaurant"
        subtitle="Join our loyalty program, earn points on every meal, and redeem delicious rewards."
        title="Welcome to Dae Bak Bon Ga."
        heroRight={
          <View style={styles.badge} testID="welcome-badge">
            <Flame color="#F7C58B" size={18} />
            <Text style={styles.badgeText}>Loyalty club</Text>
          </View>
        }
      >
        <Panel testID="welcome-panel-brand">
          <View style={styles.brandRow}>
            <Pressable onPress={handleLogoPress} style={styles.logoWrap} testID="welcome-logo-wrap">
              <Image contentFit="contain" source={require("@/assets/images/DBBG_LOGO.png")} style={styles.logo} />
            </Pressable>
            <View style={styles.brandTextWrap}>
              <Text style={styles.brandKicker}>Official member app</Text>
              <Text style={styles.brandName}>Dae Bak Bon Ga Korean Restaurant</Text>
              <Text style={styles.brandCopy}>Track points, unlock tiers, and redeem Korean BBQ favorites from one polished mobile experience.</Text>
            </View>
          </View>
        </Panel>

        <Panel testID="welcome-panel-intro">
          <SectionTitle
            copy="Start earning points and unlocking rewards with every visit."
            title="Get started"
          />
          <ActionButton
            icon={UserRound}
            label="Sign up for membership"
            onPress={() => {
              console.log("Opening member signup from welcome screen");
              router.push("/member-signup");
            }}
            testID="welcome-signup-button"
            variant="primary"
          />
          <ActionButton
            icon={Star}
            label="Log in to my account"
            onPress={() => {
              console.log("Opening member login from welcome screen");
              router.push("/member-login");
            }}
            testID="welcome-login-button"
            variant="secondary"
          />
        </Panel>

        <Panel testID="welcome-panel-features">
          <SectionTitle
            copy="Earn points, climb tiers, and enjoy exclusive Korean BBQ rewards."
            title="Member perks"
          />
          <View style={styles.featureRow}>
            <Flame color="#F7C58B" size={18} />
            <Text style={styles.featureText}>Earn points on every dollar spent</Text>
          </View>
          <View style={styles.featureRow}>
            <Star color="#F7C58B" size={18} />
            <Text style={styles.featureText}>Unlock membership tiers</Text>
          </View>
          <View style={styles.featureRow}>
            <UserRound color="#F7C58B" size={18} />
            <Text style={styles.featureText}>Redeem rewards for your favorites</Text>
          </View>
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
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
    fontWeight: "800",
  },
  brandCopy: {
    color: "#D7BDA9",
    fontSize: 14,
    lineHeight: 21,
  },
  brandKicker: {
    color: "#F7C58B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  brandName: {
    color: "#FFF7ED",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 18,
  },
  brandTextWrap: {
    flex: 1,
    gap: 8,
  },
  featureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  featureText: {
    color: "#F8E7D0",
    fontSize: 14,
    fontWeight: "600",
  },
  loader: {
    alignItems: "center",
    backgroundColor: "#120A08",
    flex: 1,
    justifyContent: "center",
  },
  logo: {
    height: 88,
    width: 88,
  },
  logoWrap: {
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 28,
    height: 112,
    justifyContent: "center",
    overflow: "hidden",
    padding: 12,
    width: 112,
  },
});
