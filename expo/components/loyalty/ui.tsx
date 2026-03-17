import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ChevronDown, ChevronRight, Gift, type LucideIcon } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface RewardItem {
  id: string;
  title: string;
  points: number;
  subtitle: string;
  accent: string;
}

interface LoyaltyScreenProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  eyebrow: string;
  heroRight?: React.ReactNode;
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  icon?: LucideIcon;
  testID: string;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
  testID: string;
}

export function LoyaltyScreen({
  children,
  title,
  subtitle,
  eyebrow,
  heroRight,
}: LoyaltyScreenProps) {
  return (
    <LinearGradient colors={["#120A08", "#24110B", "#090909"]} style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          testID="loyalty-screen"
        >
          <View style={styles.heroCard} testID="loyalty-hero-card">
            <View style={styles.heroRow}>
              <View style={styles.heroTextWrap}>
                <Text style={styles.eyebrow}>{eyebrow}</Text>
                <Text style={styles.heroTitle}>{title}</Text>
              </View>
              {heroRight ? <View style={styles.heroRight}>{heroRight}</View> : null}
            </View>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function ActionButton({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  testID,
}: ActionButtonProps) {
  const isPrimary = variant === "primary";
  const isGhost = variant === "ghost";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary ? styles.buttonPrimary : undefined,
        variant === "secondary" ? styles.buttonSecondary : undefined,
        isGhost ? styles.buttonGhost : undefined,
        pressed ? styles.buttonPressed : undefined,
      ]}
      testID={testID}
    >
      <View style={styles.buttonContent}>
        {Icon ? <Icon color={isPrimary ? "#1A120E" : "#F8E7D0"} size={18} /> : null}
        <Text
          style={[
            styles.buttonLabel,
            isPrimary ? styles.buttonLabelPrimary : undefined,
            !isPrimary ? styles.buttonLabelSecondary : undefined,
          ]}
        >
          {label}
        </Text>
        {!isGhost ? <ChevronRight color={isPrimary ? "#1A120E" : "#F8E7D0"} size={18} /> : null}
      </View>
    </Pressable>
  );
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  testID,
}: InputFieldProps) {
  return (
    <View style={styles.inputWrap} testID={`${testID}-wrap`}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E6D56"
        secureTextEntry={secureTextEntry}
        style={styles.input}
        testID={testID}
        value={value}
      />
    </View>
  );
}

export function Panel({ children, testID }: { children: React.ReactNode; testID: string }) {
  return (
    <View style={styles.panel} testID={testID}>
      {children}
    </View>
  );
}

export function CollapsiblePanel({
  children,
  testID,
  title,
  copy,
  icon: Icon,
  iconColor = "#F7C58B",
  defaultOpen = false,
}: {
  children: React.ReactNode;
  testID: string;
  title: string;
  copy: string;
  icon?: LucideIcon;
  iconColor?: string;
  defaultOpen?: boolean;
}) {
  const [expanded, setExpanded] = useState<boolean>(defaultOpen);
  const spinAnim = useRef(new Animated.Value(defaultOpen ? 1 : 0)).current;

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !expanded;
    setExpanded(next);
    Animated.timing(spinAnim, {
      toValue: next ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [expanded, spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.panel} testID={testID}>
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [styles.collapsibleHeader, pressed && { opacity: 0.8 }]}
        testID={`${testID}-toggle`}
      >
        <View style={styles.collapsibleHeaderLeft}>
          {Icon && (
            <View style={styles.collapsibleIconWrap}>
              <Icon color={iconColor} size={18} />
            </View>
          )}
          <View style={styles.collapsibleTextWrap}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionCopy} numberOfLines={expanded ? undefined : 1}>{copy}</Text>
          </View>
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ChevronDown color="#C8AA94" size={20} />
        </Animated.View>
      </Pressable>
      {expanded && (
        <View style={styles.collapsibleContent}>
          {children}
        </View>
      )}
    </View>
  );
}

export function SectionTitle({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCopy}>{copy}</Text>
    </View>
  );
}

export function RewardCard({ item }: { item: RewardItem }) {
  return (
    <View style={styles.rewardCard} testID={`reward-card-${item.id}`}>
      <View style={[styles.rewardAccent, { backgroundColor: item.accent }]} />
      <View style={styles.rewardBody}>
        <Text style={styles.rewardTitle}>{item.title}</Text>
        <Text style={styles.rewardSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={styles.rewardPill}>
        <Gift color="#1A120E" size={16} />
        <Text style={styles.rewardPillText}>{item.points} pts</Text>
      </View>
    </View>
  );
}

export function QuickLink({
  label,
  route,
  caption,
  testID,
}: {
  label: string;
  route: "/member-signup" | "/member-login" | "/member-dashboard" | "/member-profile";
  caption: string;
  testID: string;
}) {
  return (
    <Pressable
      onPress={() => {
        console.log("Navigating to route", route);
        router.push(route);
      }}
      style={({ pressed }) => [styles.quickLink, pressed ? styles.buttonPressed : undefined]}
      testID={testID}
    >
      <View>
        <Text style={styles.quickLinkLabel}>{label}</Text>
        <Text style={styles.quickLinkCaption}>{caption}</Text>
      </View>
      <ChevronRight color="#F8E7D0" size={18} />
    </Pressable>
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
    paddingTop: 20,
    paddingBottom: 36,
    gap: 18,
  },
  heroCard: {
    backgroundColor: "rgba(84, 39, 18, 0.65)",
    borderColor: "rgba(247, 197, 139, 0.22)",
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    gap: 12,
    overflow: "hidden",
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  heroTextWrap: {
    flex: 1,
    gap: 8,
  },
  heroRight: {
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  eyebrow: {
    color: "#F7C58B",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFF7ED",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
  heroSubtitle: {
    color: "#E7CDB8",
    fontSize: 15,
    lineHeight: 23,
  },
  panel: {
    backgroundColor: "rgba(20, 12, 10, 0.78)",
    borderColor: "rgba(247, 197, 139, 0.14)",
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    gap: 16,
  },
  collapsibleHeader: {
    alignItems: "center" as const,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  collapsibleHeaderLeft: {
    alignItems: "center" as const,
    flex: 1,
    flexDirection: "row" as const,
    gap: 12,
  },
  collapsibleIconWrap: {
    alignItems: "center" as const,
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 12,
    height: 36,
    justifyContent: "center" as const,
    width: 36,
  },
  collapsibleTextWrap: {
    flex: 1,
    gap: 2,
  },
  collapsibleContent: {
    gap: 16,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: "#FFF7ED",
    fontSize: 21,
    fontWeight: "800",
  },
  sectionCopy: {
    color: "#C8AA94",
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  buttonPrimary: {
    backgroundColor: "#F7C58B",
  },
  buttonSecondary: {
    backgroundColor: "#3C2418",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderWidth: 1,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  buttonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  buttonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  buttonLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
  },
  buttonLabelPrimary: {
    color: "#1A120E",
  },
  buttonLabelSecondary: {
    color: "#F8E7D0",
  },
  inputWrap: {
    gap: 8,
  },
  inputLabel: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF7ED",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rewardCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  rewardAccent: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  rewardBody: {
    flex: 1,
    gap: 4,
  },
  rewardTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800",
  },
  rewardSubtitle: {
    color: "#C9AD99",
    fontSize: 13,
    lineHeight: 18,
  },
  rewardPill: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rewardPillText: {
    color: "#1A120E",
    fontSize: 13,
    fontWeight: "800",
  },
  quickLink: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  quickLinkLabel: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800",
  },
  quickLinkCaption: {
    color: "#C8AA94",
    fontSize: 13,
    marginTop: 3,
  },
});
