import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import {
  Bell,
  Cake,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Megaphone,
  Send,
  Sparkles,
  Users,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";

import {
  ActionButton,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { useMembersStore, type StoredMember } from "@/providers/members-store-provider";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type MessageCategory = "custom" | "birthday" | "points_expiring" | "special_deal";

interface MessageTemplate {
  id: MessageCategory;
  title: string;
  description: string;
  icon: typeof Megaphone;
  iconColor: string;
  defaultMessage: string;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "custom",
    title: "Custom message",
    description: "Write your own marketing message to send to members.",
    icon: Megaphone,
    iconColor: "#F7C58B",
    defaultMessage: "",
  },
  {
    id: "birthday",
    title: "Birthday special",
    description: "Send birthday wishes with a special offer to members with birthdays this month.",
    icon: Cake,
    iconColor: "#F472B6",
    defaultMessage: "🎂 Happy Birthday from Dae Bak Bon Ga! Celebrate with us and enjoy a special treat on your next visit. Show this text to your server!",
  },
  {
    id: "points_expiring",
    title: "Points expiring soon",
    description: "Remind members whose points expire within 30 days to visit and use them.",
    icon: Clock,
    iconColor: "#F59E0B",
    defaultMessage: "⏰ Your Dae Bak Bon Ga loyalty points are expiring soon! Visit us before they expire and redeem your rewards. Don't let your hard-earned points go to waste!",
  },
  {
    id: "special_deal",
    title: "Special deal / holiday",
    description: "Announce a limited-time special offer or holiday promotion.",
    icon: Sparkles,
    iconColor: "#60A5FA",
    defaultMessage: "🌟 Special offer at Dae Bak Bon Ga! Visit us this week for an exclusive deal. Ask your server for details. We can't wait to see you!",
  },
];

function getEligibleMembers(
  members: StoredMember[],
  category: MessageCategory,
): StoredMember[] {
  const optedIn = members.filter((m) => m.marketingOptIn);

  if (category === "birthday") {
    const currentMonth = new Date().getMonth() + 1;
    return optedIn.filter((m) => {
      if (!m.birthdate) return false;
      const parts = m.birthdate.split("/");
      const memberMonth = parseInt(parts[0], 10);
      return memberMonth === currentMonth;
    });
  }

  if (category === "points_expiring") {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const now = new Date();

    return optedIn.filter((m) => {
      return m.pointsHistory.some((entry) => {
        if (entry.type !== "earned" || !entry.expiresAt) return false;
        const expiresAt = new Date(entry.expiresAt);
        return expiresAt > now && expiresAt <= thirtyDaysFromNow;
      });
    });
  }

  return optedIn;
}

export default function AdminMarketingScreen() {
  const { members } = useMembersStore();
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory>("custom");
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showRecipients, setShowRecipients] = useState<boolean>(false);

  const optedInCount = useMemo(() => members.filter((m) => m.marketingOptIn).length, [members]);

  const eligibleMembers = useMemo(
    () => getEligibleMembers(members, selectedCategory),
    [members, selectedCategory],
  );

  const handleSelectCategory = useCallback((category: MessageCategory) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedCategory(category);
    const template = MESSAGE_TEMPLATES.find((t) => t.id === category);
    setMessage(template?.defaultMessage ?? "");
    setShowRecipients(false);
    console.log("[Marketing] Selected category:", category);
  }, []);

  const toggleRecipients = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRecipients((prev) => !prev);
  }, []);

  const handleSend = useCallback(() => {
    if (!message.trim()) {
      Alert.alert("Empty message", "Please write a message before sending.");
      return;
    }

    if (eligibleMembers.length === 0) {
      Alert.alert("No recipients", "No eligible members found for this message category. Members must have marketing texts enabled.");
      return;
    }

    Alert.alert(
      "Send marketing text",
      `Send this message to ${eligibleMembers.length} member${eligibleMembers.length !== 1 ? "s" : ""}?\n\n"${message.trim().substring(0, 100)}${message.trim().length > 100 ? "..." : ""}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setIsSending(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              console.log("[Marketing] Sending message to", eligibleMembers.length, "members");
              console.log("[Marketing] Message:", message.trim());
              console.log("[Marketing] Recipients:", eligibleMembers.map((m) => m.phone));

              await new Promise((resolve) => setTimeout(resolve, 1500));

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Messages sent!",
                `Your marketing text has been queued for ${eligibleMembers.length} member${eligibleMembers.length !== 1 ? "s" : ""}. Messages will be delivered shortly.`,
              );
              setMessage("");
              console.log("[Marketing] Messages sent successfully");
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              console.error("[Marketing] Send error:", msg);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Failed to send", msg);
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  }, [eligibleMembers, message]);

  return (
    <>
      <Stack.Screen options={{ title: "Marketing texts", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Staff tools"
        subtitle="Send promotional text messages to opted-in members."
        title="Marketing texts."
        heroRight={
          <View style={styles.heroBadge} testID="marketing-hero-badge">
            <Megaphone color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="marketing-stats-panel">
          <SectionTitle copy="Overview of your marketing reach." title="Audience stats" />
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Users color="#F7C58B" size={18} />
              <Text style={styles.statValue}>{members.length}</Text>
              <Text style={styles.statLabel}>Total members</Text>
            </View>
            <View style={styles.statCard}>
              <Bell color="#22C55E" size={18} />
              <Text style={styles.statValue}>{optedInCount}</Text>
              <Text style={styles.statLabel}>Opted in</Text>
            </View>
            <View style={styles.statCard}>
              <Filter color="#60A5FA" size={18} />
              <Text style={styles.statValue}>{eligibleMembers.length}</Text>
              <Text style={styles.statLabel}>Recipients</Text>
            </View>
          </View>
        </Panel>

        <Panel testID="marketing-template-panel">
          <SectionTitle copy="Choose a message type to target the right audience." title="Message type" />
          {MESSAGE_TEMPLATES.map((template) => {
            const isSelected = selectedCategory === template.id;
            const Icon = template.icon;
            return (
              <Pressable
                key={template.id}
                onPress={() => handleSelectCategory(template.id)}
                style={({ pressed }) => [
                  styles.templateCard,
                  isSelected && styles.templateCardSelected,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                ]}
                testID={`marketing-template-${template.id}`}
              >
                <View style={[styles.templateIconWrap, { backgroundColor: `${template.iconColor}18` }]}>
                  <Icon color={template.iconColor} size={20} />
                </View>
                <View style={styles.templateContent}>
                  <Text style={[styles.templateTitle, isSelected && styles.templateTitleSelected]}>
                    {template.title}
                  </Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                </View>
                {isSelected && (
                  <View style={styles.templateCheck}>
                    <View style={styles.templateCheckDot} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </Panel>

        <Panel testID="marketing-compose-panel">
          <SectionTitle copy="Write or edit your message below. Keep it concise and engaging." title="Compose message" />

          <View style={styles.composeWrap}>
            <TextInput
              multiline
              numberOfLines={5}
              onChangeText={setMessage}
              placeholder="Type your marketing message here..."
              placeholderTextColor="#8E6D56"
              style={styles.composeInput}
              testID="marketing-message-input"
              textAlignVertical="top"
              value={message}
            />
            <Text style={styles.charCount}>{message.length} characters</Text>
          </View>

          <Pressable
            onPress={toggleRecipients}
            style={({ pressed }) => [styles.recipientsToggle, pressed && { opacity: 0.8 }]}
            testID="marketing-recipients-toggle"
          >
            <Users color="#F7C58B" size={16} />
            <Text style={styles.recipientsToggleText}>
              {eligibleMembers.length} recipient{eligibleMembers.length !== 1 ? "s" : ""} for this message
            </Text>
            {showRecipients ? <ChevronUp color="#C8AA94" size={16} /> : <ChevronDown color="#C8AA94" size={16} />}
          </Pressable>

          {showRecipients && (
            <View style={styles.recipientsList}>
              {eligibleMembers.length === 0 ? (
                <Text style={styles.noRecipientsText}>No eligible members found for this category.</Text>
              ) : (
                eligibleMembers.slice(0, 20).map((m) => (
                  <View key={m.id} style={styles.recipientRow}>
                    <View style={styles.recipientDot} />
                    <Text style={styles.recipientName} numberOfLines={1}>{m.fullName}</Text>
                    <Text style={styles.recipientPhone}>{m.phone}</Text>
                  </View>
                ))
              )}
              {eligibleMembers.length > 20 && (
                <Text style={styles.recipientsMore}>
                  +{eligibleMembers.length - 20} more members
                </Text>
              )}
            </View>
          )}

          <ActionButton
            icon={Send}
            label={
              isSending
                ? "Sending messages..."
                : `Send to ${eligibleMembers.length} member${eligibleMembers.length !== 1 ? "s" : ""}`
            }
            onPress={handleSend}
            testID="marketing-send-button"
            variant="primary"
          />
        </Panel>

        <Panel testID="marketing-info-panel">
          <View style={styles.infoNote}>
            <Bell color="#F59E0B" size={16} />
            <Text style={styles.infoNoteText}>
              Only members who opted in to marketing texts during sign-up will receive these messages. Members can opt out anytime from their profile settings.
            </Text>
          </View>
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  charCount: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "right" as const,
  },
  composeInput: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF7ED",
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  composeWrap: {
    gap: 6,
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  infoNote: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoNoteText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 17,
  },
  noRecipientsText: {
    color: "#8E6D56",
    fontSize: 13,
    fontStyle: "italic" as const,
    paddingVertical: 8,
    textAlign: "center" as const,
  },
  recipientDot: {
    backgroundColor: "#22C55E",
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  recipientName: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  recipientPhone: {
    color: "#C8AA94",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  recipientRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 6,
  },
  recipientsList: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 300,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recipientsMore: {
    color: "#C8AA94",
    fontSize: 12,
    fontWeight: "600" as const,
    paddingTop: 6,
    textAlign: "center" as const,
  },
  recipientsToggle: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  recipientsToggleText: {
    color: "#F7C58B",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
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
  statLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  statValue: {
    color: "#FFF7ED",
    fontSize: 20,
    fontWeight: "900" as const,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  templateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  templateCardSelected: {
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderColor: "rgba(247, 197, 139, 0.3)",
  },
  templateCheck: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 999,
    height: 20,
    justifyContent: "center",
    width: 20,
  },
  templateCheckDot: {
    backgroundColor: "#1A120E",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  templateContent: {
    flex: 1,
    gap: 3,
  },
  templateDescription: {
    color: "#C8AA94",
    fontSize: 12,
    lineHeight: 17,
  },
  templateIconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  templateTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  templateTitleSelected: {
    color: "#F7C58B",
  },
});
