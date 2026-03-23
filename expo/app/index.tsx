import { Stack, router, Redirect } from "expo-router";
import { Image } from "expo-image";
import { Flame, Gift, Star, UserRound } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";
import { ChevronDown } from "lucide-react-native";

import { ActionButton, LoyaltyScreen, Panel, SectionTitle } from "@/components/loyalty/ui";
import { useAdminAuth } from "@/providers/admin-auth-provider";
import { useAuth } from "@/providers/auth-provider";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function CollapsiblePerk({ icon, title, description, accent }: { icon: React.ReactNode; title: string; description: string; accent: string }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      Animated.timing(spinValue, {
        toValue: prev ? 0 : 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      return !prev;
    });
  }, [spinValue]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Pressable onPress={toggle} style={styles.perkItem}>
      <View style={styles.perkHeader}>
        <View style={[styles.perkIconWrap, { backgroundColor: accent + "18" }]}>
          {icon}
        </View>
        <Text style={styles.perkTitle}>{title}</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown color="#D7BDA9" size={16} />
        </Animated.View>
      </View>
      {expanded && (
        <View style={styles.perkBody}>
          <Text style={styles.perkDescription}>{description}</Text>
        </View>
      )}
    </Pressable>
  );
}

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
        title="Welcome to Dae Bak Bon Ga"
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
            copy="Exclusive deals and special offers for members throughout the year"
            title="Member perks"
          />
          <View style={styles.perksContainer}>
            <CollapsiblePerk
              icon={<Flame color="#F59E0B" size={16} />}
              title="Earn Points on Every Dollar"
              description="Every dollar you spend earns you loyalty points. The more you dine, the more you earn — stack them up and redeem for delicious rewards."
              accent="#F59E0B"
            />
            <CollapsiblePerk
              icon={<Star color="#FB7185" size={16} />}
              title="Unlock Membership Tiers"
              description="Rise through the tiers to unlock bonus points and exclusive perks that make every visit more rewarding."
              accent="#FB7185"
            />
            <CollapsiblePerk
              icon={<UserRound color="#60A5FA" size={16} />}
              title="Redeem Rewards for Your Favorites"
              description="Cash in your points for menu favorites like banchan upgrades, soju flights, and our signature galbi plate. New rewards added regularly!"
              accent="#60A5FA"
            />
            <CollapsiblePerk
              icon={<Gift color="#F97316" size={16} />}
              title="Member-Only Exclusive Deals"
              description="Enjoy special offers reserved just for members — from happy hour discounts and birthday treats to early access to seasonal menus throughout the year."
              accent="#F97316"
            />
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
  perksContainer: {
    gap: 8,
  },
  perkItem: {
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  perkHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  perkIconWrap: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  perkTitle: {
    color: "#F8E7D0",
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  perkBody: {
    borderTopColor: "rgba(247, 197, 139, 0.08)",
    borderTopWidth: 1,
    paddingBottom: 14,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  perkDescription: {
    color: "#D7BDA9",
    fontSize: 13,
    lineHeight: 20,
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
