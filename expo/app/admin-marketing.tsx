import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import {
  Bell,
  Cake,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Megaphone,
  Search,
  Send,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ActionButton,
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import { trpcClient } from "@/lib/trpc";
import { useMembersStore, type StoredMember } from "@/providers/members-store-provider";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AUTO_REMINDER_STORAGE_KEY = "dbbg-auto-expiry-reminder";
const AUTO_REMINDER_ENABLED_KEY = "dbbg-auto-expiry-enabled";

interface AutoReminderLog {
  lastSentAt: string;
  memberIds: string[];
  count: number;
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

type RecipientMode = "all" | "select";

export default function AdminMarketingScreen() {
  const { members } = useMembersStore();
  const [selectedCategory, setSelectedCategory] = useState<MessageCategory>("custom");
  const [message, setMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [showRecipients, setShowRecipients] = useState<boolean>(false);
  const [autoEnabled, setAutoEnabled] = useState<boolean>(false);
  const [lastAutoReminder, setLastAutoReminder] = useState<AutoReminderLog | null>(null);
  const [isSendingAuto, setIsSendingAuto] = useState<boolean>(false);
  const [loadingAutoState, setLoadingAutoState] = useState<boolean>(true);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState<string>("");

  useEffect(() => {
    const loadAutoState = async () => {
      try {
        const [enabledRaw, logRaw] = await Promise.all([
          AsyncStorage.getItem(AUTO_REMINDER_ENABLED_KEY),
          AsyncStorage.getItem(AUTO_REMINDER_STORAGE_KEY),
        ]);
        if (enabledRaw !== null) setAutoEnabled(JSON.parse(enabledRaw));
        if (logRaw) setLastAutoReminder(JSON.parse(logRaw));
        console.log("[Marketing] Loaded auto-reminder state, enabled:", enabledRaw, "log:", logRaw);
      } catch (err) {
        console.error("[Marketing] Failed to load auto-reminder state:", err);
      } finally {
        setLoadingAutoState(false);
      }
    };
    void loadAutoState();
  }, []);

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
    setRecipientMode("all");
    setSelectedMemberIds(new Set());
    setMemberSearch("");
    console.log("[Marketing] Selected category:", category);
  }, []);

  const finalRecipients = useMemo(() => {
    if (recipientMode === "all") return eligibleMembers;
    return eligibleMembers.filter((m) => selectedMemberIds.has(m.id));
  }, [recipientMode, eligibleMembers, selectedMemberIds]);

  const filteredEligibleMembers = useMemo(() => {
    if (!memberSearch.trim()) return eligibleMembers;
    const q = memberSearch.toLowerCase().trim();
    return eligibleMembers.filter(
      (m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.phone.includes(q),
    );
  }, [eligibleMembers, memberSearch]);

  const toggleMemberSelection = useCallback((memberId: string) => {
    void Haptics.selectionAsync();
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      for (const m of filteredEligibleMembers) {
        next.add(m.id);
      }
      return next;
    });
  }, [filteredEligibleMembers]);

  const deselectAll = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMemberIds(new Set());
  }, []);

  const handleRecipientModeChange = useCallback((mode: RecipientMode) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRecipientMode(mode);
    if (mode === "all") {
      setSelectedMemberIds(new Set());
      setMemberSearch("");
    }
    console.log("[Marketing] Recipient mode changed to:", mode);
  }, []);

  const toggleRecipients = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRecipients((prev) => !prev);
  }, []);

  const expiringMembers = useMemo(() => {
    return getEligibleMembers(members, "points_expiring");
  }, [members]);

  const alreadySentToday = useMemo(() => {
    if (!lastAutoReminder) return false;
    const lastDate = new Date(lastAutoReminder.lastSentAt).toDateString();
    const today = new Date().toDateString();
    return lastDate === today;
  }, [lastAutoReminder]);

  const handleToggleAuto = useCallback(async (value: boolean) => {
    setAutoEnabled(value);
    try {
      await AsyncStorage.setItem(AUTO_REMINDER_ENABLED_KEY, JSON.stringify(value));
      console.log("[Marketing] Auto-reminder toggled:", value);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error("[Marketing] Failed to save auto state:", err);
    }
  }, []);

  const doSendAutoReminder = useCallback(async () => {
    setIsSendingAuto(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const reminderMessage = "\u23F0 Your Dae Bak Bon Ga loyalty points are expiring soon! Visit us before they expire and redeem your rewards. Don't let your hard-earned points go to waste!";

    try {
      console.log("[Marketing] Sending auto expiry reminders to", expiringMembers.length, "members");

      const data = await trpcClient.sms.sendMarketing.mutate({
        recipients: expiringMembers.map((m) => ({ phone: m.phone, name: m.fullName })),
        message: reminderMessage,
      });

      if (!data.success && data.failed > 0) {
        console.warn(`[Marketing] Some auto-reminders failed: ${data.failed}/${data.total}`);
      }
      console.log("[Marketing] Auto-reminder response:", data);

      const log: AutoReminderLog = {
        lastSentAt: new Date().toISOString(),
        memberIds: expiringMembers.map((m) => m.id),
        count: expiringMembers.length,
      };
      await AsyncStorage.setItem(AUTO_REMINDER_STORAGE_KEY, JSON.stringify(log));
      setLastAutoReminder(log);

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Reminders sent!",
        `Expiry reminder sent to ${expiringMembers.length} member${expiringMembers.length !== 1 ? "s" : ""} with points expiring within 30 days.`,
      );
      console.log("[Marketing] Auto expiry reminders sent successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Marketing] Auto-reminder send error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to send", msg);
    } finally {
      setIsSendingAuto(false);
    }
  }, [expiringMembers]);

  const handleSendAutoReminder = useCallback(async () => {
    if (expiringMembers.length === 0) {
      Alert.alert("No members", "No opted-in members have points expiring within 30 days.");
      return;
    }

    if (alreadySentToday) {
      Alert.alert(
        "Already sent today",
        `Expiry reminders were already sent today to ${lastAutoReminder?.count ?? 0} member(s). Send again?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Send again", onPress: () => void doSendAutoReminder() },
        ],
      );
      return;
    }

    void doSendAutoReminder();
  }, [expiringMembers, alreadySentToday, lastAutoReminder, doSendAutoReminder]);

  const handleSend = useCallback(() => {
    if (!message.trim()) {
      Alert.alert("Empty message", "Please write a message before sending.");
      return;
    }

    if (finalRecipients.length === 0) {
      if (recipientMode === "select") {
        Alert.alert("No recipients selected", "Please select at least one member to send the message to.");
      } else {
        Alert.alert("No recipients", "No eligible members found for this message category. Members must have marketing texts enabled.");
      }
      return;
    }

    Alert.alert(
      "Send marketing text",
      `Send this message to ${finalRecipients.length} member${finalRecipients.length !== 1 ? "s" : ""}?\n\n"${message.trim().substring(0, 100)}${message.trim().length > 100 ? "..." : ""}"`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setIsSending(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              console.log("[Marketing] Sending message to", finalRecipients.length, "members");
              console.log("[Marketing] Message:", message.trim());
              console.log("[Marketing] Recipients:", finalRecipients.map((m) => m.phone));

              const data = await trpcClient.sms.sendMarketing.mutate({
                recipients: finalRecipients.map((m) => ({ phone: m.phone, name: m.fullName })),
                message: message.trim(),
              });

              if (!data.success && data.failed > 0) {
                console.warn(`[Marketing] Some messages failed: ${data.failed}/${data.total}`);
              }
              console.log("[Marketing] Backend response:", data);

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Messages sent!",
                `Your marketing text has been queued for ${finalRecipients.length} member${finalRecipients.length !== 1 ? "s" : ""}. Messages will be delivered shortly.`,
              );
              setMessage("");
              setSelectedMemberIds(new Set());
              setRecipientMode("all");
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
  }, [finalRecipients, message, recipientMode]);

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

          <View style={styles.recipientModeRow}>
            <Pressable
              onPress={() => handleRecipientModeChange("all")}
              style={({ pressed }) => [
                styles.recipientModeBtn,
                recipientMode === "all" && styles.recipientModeBtnActive,
                pressed && { opacity: 0.85 },
              ]}
              testID="marketing-mode-all"
            >
              <Users color={recipientMode === "all" ? "#1A120E" : "#C8AA94"} size={15} />
              <Text style={[styles.recipientModeBtnText, recipientMode === "all" && styles.recipientModeBtnTextActive]}>
                All ({eligibleMembers.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleRecipientModeChange("select")}
              style={({ pressed }) => [
                styles.recipientModeBtn,
                recipientMode === "select" && styles.recipientModeBtnActive,
                pressed && { opacity: 0.85 },
              ]}
              testID="marketing-mode-select"
            >
              <UserCheck color={recipientMode === "select" ? "#1A120E" : "#C8AA94"} size={15} />
              <Text style={[styles.recipientModeBtnText, recipientMode === "select" && styles.recipientModeBtnTextActive]}>
                Select{selectedMemberIds.size > 0 ? ` (${selectedMemberIds.size})` : ""}
              </Text>
            </Pressable>
          </View>

          {recipientMode === "select" && (
            <View style={styles.memberSelectContainer}>
              <View style={styles.memberSearchWrap}>
                <Search color="#8E6D56" size={16} />
                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search by name or phone..."
                  placeholderTextColor="#8E6D56"
                  style={styles.memberSearchInput}
                  testID="marketing-member-search"
                />
                {memberSearch.length > 0 && (
                  <Pressable onPress={() => setMemberSearch("")} hitSlop={8}>
                    <X color="#8E6D56" size={16} />
                  </Pressable>
                )}
              </View>

              <View style={styles.memberSelectActions}>
                <Pressable
                  onPress={selectAllFiltered}
                  style={({ pressed }) => [styles.selectActionBtn, pressed && { opacity: 0.7 }]}
                  testID="marketing-select-all"
                >
                  <Text style={styles.selectActionText}>Select all{memberSearch.trim() ? " filtered" : ""}</Text>
                </Pressable>
                {selectedMemberIds.size > 0 && (
                  <Pressable
                    onPress={deselectAll}
                    style={({ pressed }) => [styles.selectActionBtn, pressed && { opacity: 0.7 }]}
                    testID="marketing-deselect-all"
                  >
                    <Text style={[styles.selectActionText, { color: "#EF4444" }]}>Deselect all</Text>
                  </Pressable>
                )}
                <Text style={styles.selectedCountText}>
                  {selectedMemberIds.size} selected
                </Text>
              </View>

              <ScrollView style={styles.memberSelectList} nestedScrollEnabled>
                {filteredEligibleMembers.length === 0 ? (
                  <Text style={styles.noRecipientsText}>
                    {memberSearch.trim() ? "No members match your search." : "No eligible members found."}
                  </Text>
                ) : (
                  filteredEligibleMembers.map((m) => {
                    const isChecked = selectedMemberIds.has(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggleMemberSelection(m.id)}
                        style={({ pressed }) => [
                          styles.memberSelectRow,
                          isChecked && styles.memberSelectRowChecked,
                          pressed && { opacity: 0.8 },
                        ]}
                        testID={`marketing-member-${m.id}`}
                      >
                        <View style={[styles.memberCheckbox, isChecked && styles.memberCheckboxChecked]}>
                          {isChecked && <Check color="#1A120E" size={13} strokeWidth={3} />}
                        </View>
                        <View style={styles.memberSelectInfo}>
                          <Text style={styles.memberSelectName} numberOfLines={1}>{m.fullName}</Text>
                          <Text style={styles.memberSelectPhone}>{m.phone}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          {recipientMode === "all" && (
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
          )}

          {recipientMode === "all" && showRecipients && (
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
                : `Send to ${finalRecipients.length} member${finalRecipients.length !== 1 ? "s" : ""}`
            }
            onPress={handleSend}
            testID="marketing-send-button"
            variant="primary"
          />
        </Panel>

        <Panel testID="marketing-auto-panel">
          <SectionTitle
            copy="Automatically text members whose points expire within 30 days."
            title="Expiry auto-reminders"
          />

          <View style={styles.autoToggleRow}>
            <View style={styles.autoToggleInfo}>
              <View style={[styles.autoIconWrap, { backgroundColor: autoEnabled ? "rgba(34, 197, 94, 0.12)" : "rgba(142, 109, 86, 0.12)" }]}>
                <Clock color={autoEnabled ? "#22C55E" : "#8E6D56"} size={18} />
              </View>
              <View style={styles.autoToggleTextWrap}>
                <Text style={styles.autoToggleLabel}>Auto expiry reminders</Text>
                <Text style={styles.autoToggleCaption}>
                  {autoEnabled
                    ? "Enabled — reminder will be sent to members with expiring points"
                    : "Disabled — no automatic reminders"}
                </Text>
              </View>
            </View>
            {loadingAutoState ? (
              <ActivityIndicator color="#F7C58B" size="small" />
            ) : (
              <Switch
                value={autoEnabled}
                onValueChange={handleToggleAuto}
                trackColor={{ false: "rgba(142, 109, 86, 0.3)", true: "rgba(34, 197, 94, 0.4)" }}
                thumbColor={autoEnabled ? "#22C55E" : "#8E6D56"}
                testID="marketing-auto-toggle"
              />
            )}
          </View>

          {autoEnabled && (
            <>
              <View style={styles.autoStatsRow}>
                <View style={styles.autoStatCard}>
                  <Text style={styles.autoStatValue}>{expiringMembers.length}</Text>
                  <Text style={styles.autoStatLabel}>Members with{"\n"}expiring points</Text>
                </View>
                <View style={styles.autoStatCard}>
                  <Text style={styles.autoStatValue}>
                    {lastAutoReminder
                      ? new Date(lastAutoReminder.lastSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "Never"}
                  </Text>
                  <Text style={styles.autoStatLabel}>Last{"\n"}reminder sent</Text>
                </View>
              </View>

              {alreadySentToday && (
                <View style={styles.sentTodayBadge}>
                  <Sparkles color="#22C55E" size={14} />
                  <Text style={styles.sentTodayText}>
                    Sent today to {lastAutoReminder?.count ?? 0} member{(lastAutoReminder?.count ?? 0) !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={handleSendAutoReminder}
                disabled={isSendingAuto || expiringMembers.length === 0}
                style={({ pressed }) => [
                  styles.autoSendBtn,
                  (isSendingAuto || expiringMembers.length === 0) && styles.autoSendBtnDisabled,
                  pressed && !isSendingAuto && expiringMembers.length > 0 && { opacity: 0.85, transform: [{ scale: 0.985 }] },
                ]}
                testID="marketing-auto-send-button"
              >
                {isSendingAuto ? (
                  <ActivityIndicator color="#1A120E" size="small" />
                ) : (
                  <Send color={expiringMembers.length === 0 ? "#8E6D56" : "#1A120E"} size={16} />
                )}
                <Text style={[
                  styles.autoSendBtnText,
                  expiringMembers.length === 0 && { color: "#8E6D56" },
                ]}>
                  {isSendingAuto
                    ? "Sending reminders..."
                    : expiringMembers.length === 0
                      ? "No members with expiring points"
                      : `Send reminder to ${expiringMembers.length} member${expiringMembers.length !== 1 ? "s" : ""}`}
                </Text>
              </Pressable>

              <View style={styles.autoHint}>
                <Bell color="#F59E0B" size={13} />
                <Text style={styles.autoHintText}>
                  To fully automate this, set up a Supabase pg_cron job that calls the "auto-expiry-reminder" edge function daily. See your Supabase dashboard under Database → Extensions → pg_cron.
                </Text>
              </View>
            </>
          )}
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
  autoHint: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.06)",
    borderColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  autoHintText: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  autoIconWrap: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  autoSendBtn: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  autoSendBtnDisabled: {
    backgroundColor: "rgba(247, 197, 139, 0.15)",
  },
  autoSendBtnText: {
    color: "#1A120E",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  autoStatCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  autoStatLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  autoStatValue: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  autoStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  autoToggleCaption: {
    color: "#C8AA94",
    fontSize: 12,
  },
  autoToggleInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
  },
  autoToggleLabel: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  autoToggleRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  autoToggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  sentTodayBadge: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sentTodayText: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700" as const,
  },
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
  memberCheckbox: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.3)",
    borderRadius: 8,
    borderWidth: 1.5,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  memberCheckboxChecked: {
    backgroundColor: "#F7C58B",
    borderColor: "#F7C58B",
  },
  memberSearchInput: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  memberSearchWrap: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memberSelectActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  memberSelectContainer: {
    gap: 10,
  },
  memberSelectInfo: {
    flex: 1,
    gap: 1,
  },
  memberSelectList: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 260,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  memberSelectName: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  memberSelectPhone: {
    color: "#C8AA94",
    fontSize: 12,
  },
  memberSelectRow: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  memberSelectRowChecked: {
    backgroundColor: "rgba(247, 197, 139, 0.08)",
  },
  recipientModeBtn: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  recipientModeBtnActive: {
    backgroundColor: "#F7C58B",
    borderColor: "#F7C58B",
  },
  recipientModeBtnText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  recipientModeBtnTextActive: {
    color: "#1A120E",
  },
  recipientModeRow: {
    flexDirection: "row",
    gap: 10,
  },
  selectActionBtn: {
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  selectActionText: {
    color: "#F7C58B",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  selectedCountText: {
    color: "#8E6D56",
    flex: 1,
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "right" as const,
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
