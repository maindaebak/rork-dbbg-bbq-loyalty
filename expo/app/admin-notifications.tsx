import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import {
  Bell,
  BellRing,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  Send,
  Smartphone,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import React, { Component, useCallback, useEffect, useMemo, useState } from "react";
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
  LoyaltyScreen,
  Panel,
  SectionTitle,
} from "@/components/loyalty/ui";
import {
  getAllPushTokens,
  sendPushNotification,
  type ScheduledNotification,
} from "@/lib/push-notifications";
import { useMembersStore } from "@/providers/members-store-provider";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCHEDULED_STORAGE_KEY = "dbbg-scheduled-notifications";
const NOTIFICATION_HISTORY_KEY = "dbbg-notification-history";

interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  recipientCount: number;
  sent: number;
  failed: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class NotificationsErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Notifications] ErrorBoundary caught:", error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: "#120A08", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <Stack.Screen options={{ title: "Push notifications", headerTintColor: "#FFF7ED" }} />
          <Text style={{ color: "#F7C58B", fontSize: 18, fontWeight: "800" as const, marginBottom: 12, textAlign: "center" as const }}>Something went wrong</Text>
          <Text style={{ color: "#C8AA94", fontSize: 14, textAlign: "center" as const, marginBottom: 20, lineHeight: 20 }}>{this.state.error?.message ?? "Unknown error"}</Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: "#F7C58B", borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 }}
          >
            <Text style={{ color: "#1A120E", fontSize: 15, fontWeight: "800" as const }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const FREQUENCY_OPTIONS: { id: ScheduledNotification["frequency"]; label: string; desc: string }[] = [
  { id: "daily", label: "Daily", desc: "Sends every day" },
  { id: "weekly", label: "Weekly", desc: "Sends once a week" },
  { id: "monthly", label: "Monthly", desc: "Sends once a month" },
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminNotificationsScreen() {
  return (
    <NotificationsErrorBoundary>
      <AdminNotificationsContent />
    </NotificationsErrorBoundary>
  );
}

function AdminNotificationsContent() {
  const { members } = useMembersStore();

  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(true);
  const [tokens, setTokens] = useState<{ memberId: string; token: string; platform: string }[]>([]);

  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState<boolean>(true);
  const [showScheduleForm, setShowScheduleForm] = useState<boolean>(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

  const [schedTitle, setSchedTitle] = useState<string>("");
  const [schedBody, setSchedBody] = useState<string>("");
  const [schedFrequency, setSchedFrequency] = useState<ScheduledNotification["frequency"]>("weekly");
  const [schedDayOfWeek, setSchedDayOfWeek] = useState<number>(1);
  const [schedDayOfMonth, setSchedDayOfMonth] = useState<number>(1);
  const [schedHour, setSchedHour] = useState<string>("12");
  const [schedMinute, setSchedMinute] = useState<string>("00");
  const [schedAudience, setSchedAudience] = useState<"all" | "opted_in">("all");

  const [history, setHistory] = useState<NotificationHistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const [recipientMode, setRecipientMode] = useState<"all" | "select">("all");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const allTokens = await getAllPushTokens();
        setTokens(allTokens);
        setTokenCount(allTokens.length);
        console.log("[Notifications] Loaded", allTokens.length, "push tokens");
      } catch (err) {
        console.error("[Notifications] Failed to load tokens:", err);
      } finally {
        setIsLoadingTokens(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const loadScheduled = async () => {
      try {
        const raw = await AsyncStorage.getItem(SCHEDULED_STORAGE_KEY);
        if (raw) {
          setScheduledNotifications(JSON.parse(raw));
          console.log("[Notifications] Loaded scheduled notifications");
        }
      } catch (err) {
        console.error("[Notifications] Failed to load scheduled:", err);
      } finally {
        setIsLoadingScheduled(false);
      }
    };
    void loadScheduled();
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const raw = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
        if (raw) setHistory(JSON.parse(raw));
      } catch (err) {
        console.error("[Notifications] Failed to load history:", err);
      }
    };
    void loadHistory();
  }, []);

  const optedInMembers = useMemo(() => members.filter((m) => m.marketingOptIn), [members]);

  const tokensForRecipients = useMemo(() => {
    if (recipientMode === "all") return tokens;
    return tokens.filter((t) => selectedMemberIds.has(t.memberId));
  }, [tokens, recipientMode, selectedMemberIds]);

  const filteredMembers = useMemo(() => {
    const eligible = members.filter((m) => tokens.some((t) => t.memberId === m.id));
    if (!memberSearch.trim()) return eligible;
    const q = memberSearch.toLowerCase().trim();
    return eligible.filter(
      (m) => m.fullName.toLowerCase().includes(q) || m.phone.includes(q),
    );
  }, [members, tokens, memberSearch]);

  const saveHistory = useCallback(async (entries: NotificationHistoryEntry[]) => {
    try {
      const trimmed = entries.slice(0, 50);
      await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(trimmed));
      setHistory(trimmed);
    } catch (err) {
      console.error("[Notifications] Failed to save history:", err);
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert("Missing fields", "Please enter both a title and message body.");
      return;
    }

    const recipientTokens = tokensForRecipients.map((t) => t.token);
    if (recipientTokens.length === 0) {
      Alert.alert("No recipients", "No members with push notification tokens found. Members need to open the app on their device to register for notifications.");
      return;
    }

    Alert.alert(
      "Send push notification",
      `Send "${title.trim()}" to ${recipientTokens.length} device${recipientTokens.length !== 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            setIsSending(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              console.log("[Notifications] Sending push to", recipientTokens.length, "devices");
              const result = await sendPushNotification(recipientTokens, title.trim(), body.trim());

              const entry: NotificationHistoryEntry = {
                id: `notif-${Date.now()}`,
                title: title.trim(),
                body: body.trim(),
                sentAt: new Date().toISOString(),
                recipientCount: recipientTokens.length,
                sent: result.sent,
                failed: result.failed,
              };
              await saveHistory([entry, ...history]);

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Notifications sent!",
                `Sent: ${result.sent}, Failed: ${result.failed} out of ${recipientTokens.length} devices.`,
              );
              setTitle("");
              setBody("");
              setSelectedMemberIds(new Set());
              setRecipientMode("all");
              console.log("[Notifications] Push sent successfully");
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              console.error("[Notifications] Send error:", msg);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Failed to send", msg);
            } finally {
              setIsSending(false);
            }
          },
        },
      ],
    );
  }, [title, body, tokensForRecipients, history, saveHistory]);

  const saveScheduled = useCallback(async (items: ScheduledNotification[]) => {
    try {
      await AsyncStorage.setItem(SCHEDULED_STORAGE_KEY, JSON.stringify(items));
      setScheduledNotifications(items);
      console.log("[Notifications] Saved", items.length, "scheduled notifications");
    } catch (err) {
      console.error("[Notifications] Failed to save scheduled:", err);
    }
  }, []);

  const resetScheduleForm = useCallback(() => {
    setSchedTitle("");
    setSchedBody("");
    setSchedFrequency("weekly");
    setSchedDayOfWeek(1);
    setSchedDayOfMonth(1);
    setSchedHour("12");
    setSchedMinute("00");
    setSchedAudience("all");
    setEditingScheduleId(null);
  }, []);

  const handleAddSchedule = useCallback(() => {
    if (!schedTitle.trim() || !schedBody.trim()) {
      Alert.alert("Missing fields", "Please enter both a title and message body for the scheduled notification.");
      return;
    }

    const hour = parseInt(schedHour, 10);
    const minute = parseInt(schedMinute, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      Alert.alert("Invalid hour", "Please enter a valid hour (0-23).");
      return;
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
      Alert.alert("Invalid minute", "Please enter a valid minute (0-59).");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (editingScheduleId) {
      const updated = scheduledNotifications.map((n) =>
        n.id === editingScheduleId
          ? {
              ...n,
              title: schedTitle.trim(),
              body: schedBody.trim(),
              frequency: schedFrequency,
              dayOfWeek: schedFrequency === "weekly" ? schedDayOfWeek : undefined,
              dayOfMonth: schedFrequency === "monthly" ? schedDayOfMonth : undefined,
              hour,
              minute,
              targetAudience: schedAudience,
            }
          : n,
      );
      void saveScheduled(updated);
    } else {
      const newNotif: ScheduledNotification = {
        id: `sched-${Date.now()}`,
        title: schedTitle.trim(),
        body: schedBody.trim(),
        frequency: schedFrequency,
        dayOfWeek: schedFrequency === "weekly" ? schedDayOfWeek : undefined,
        dayOfMonth: schedFrequency === "monthly" ? schedDayOfMonth : undefined,
        hour,
        minute,
        enabled: true,
        createdAt: new Date().toISOString(),
        targetAudience: schedAudience,
      };
      void saveScheduled([...scheduledNotifications, newNotif]);
    }

    resetScheduleForm();
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowScheduleForm(false);
  }, [
    schedTitle, schedBody, schedFrequency, schedDayOfWeek, schedDayOfMonth,
    schedHour, schedMinute, schedAudience, editingScheduleId, scheduledNotifications,
    saveScheduled, resetScheduleForm,
  ]);

  const handleEditSchedule = useCallback((notif: ScheduledNotification) => {
    setSchedTitle(notif.title);
    setSchedBody(notif.body);
    setSchedFrequency(notif.frequency);
    setSchedDayOfWeek(notif.dayOfWeek ?? 1);
    setSchedDayOfMonth(notif.dayOfMonth ?? 1);
    setSchedHour(String(notif.hour));
    setSchedMinute(String(notif.minute).padStart(2, "0"));
    setSchedAudience(notif.targetAudience);
    setEditingScheduleId(notif.id);
    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowScheduleForm(true);
  }, []);

  const handleToggleSchedule = useCallback((id: string, value: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = scheduledNotifications.map((n) =>
      n.id === id ? { ...n, enabled: value } : n,
    );
    void saveScheduled(updated);
  }, [scheduledNotifications, saveScheduled]);

  const handleDeleteSchedule = useCallback((id: string) => {
    Alert.alert("Delete schedule", "Remove this recurring notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          const updated = scheduledNotifications.filter((n) => n.id !== id);
          void saveScheduled(updated);
        },
      },
    ]);
  }, [scheduledNotifications, saveScheduled]);

  const handleSendScheduledNow = useCallback(async (notif: ScheduledNotification) => {
    const allTokens = await getAllPushTokens();
    const recipientTokens = notif.targetAudience === "opted_in"
      ? allTokens.filter((t) => optedInMembers.some((m) => m.id === t.memberId)).map((t) => t.token)
      : allTokens.map((t) => t.token);

    if (recipientTokens.length === 0) {
      Alert.alert("No recipients", "No members with push tokens found.");
      return;
    }

    Alert.alert(
      "Send now",
      `Send "${notif.title}" to ${recipientTokens.length} device${recipientTokens.length !== 1 ? "s" : ""} right now?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: async () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              const result = await sendPushNotification(recipientTokens, notif.title, notif.body);
              const updated = scheduledNotifications.map((n) =>
                n.id === notif.id ? { ...n, lastSentAt: new Date().toISOString() } : n,
              );
              void saveScheduled(updated);

              const entry: NotificationHistoryEntry = {
                id: `notif-${Date.now()}`,
                title: notif.title,
                body: notif.body,
                sentAt: new Date().toISOString(),
                recipientCount: recipientTokens.length,
                sent: result.sent,
                failed: result.failed,
              };
              await saveHistory([entry, ...history]);

              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Sent!", `Delivered to ${result.sent} of ${recipientTokens.length} devices.`);
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Failed", msg);
            }
          },
        },
      ],
    );
  }, [scheduledNotifications, optedInMembers, history, saveScheduled, saveHistory]);

  const toggleMemberSelection = useCallback((memberId: string) => {
    void Haptics.selectionAsync();
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  }, []);

  const formatScheduleTime = useCallback((notif: ScheduledNotification) => {
    const h = notif.hour % 12 || 12;
    const ampm = notif.hour >= 12 ? "PM" : "AM";
    const m = String(notif.minute).padStart(2, "0");
    let when = "";
    if (notif.frequency === "daily") when = "Every day";
    else if (notif.frequency === "weekly") when = `Every ${DAYS_OF_WEEK[notif.dayOfWeek ?? 0]}`;
    else if (notif.frequency === "monthly") when = `${notif.dayOfMonth}${getOrdinalSuffix(notif.dayOfMonth ?? 1)} of each month`;
    return `${when} at ${h}:${m} ${ampm}`;
  }, []);

  if (!members) {
    return (
      <View style={{ flex: 1, backgroundColor: "#120A08", justifyContent: "center", alignItems: "center" }}>
        <Stack.Screen options={{ title: "Push notifications", headerTintColor: "#FFF7ED" }} />
        <ActivityIndicator color="#F7C58B" size="large" />
        <Text style={{ color: "#C8AA94", marginTop: 12, fontSize: 14 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Push notifications", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Staff tools"
        subtitle="Send push notifications to members who have the app installed on their device."
        title="Push notifications."
        heroRight={
          <View style={s.heroBadge} testID="notifications-hero-badge">
            <BellRing color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="notifications-stats-panel">
          <SectionTitle copy="Overview of your notification reach." title="Device stats" />
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Smartphone color="#F7C58B" size={18} />
              {isLoadingTokens ? (
                <ActivityIndicator color="#FFF7ED" size="small" />
              ) : (
                <Text style={s.statValue}>{tokenCount}</Text>
              )}
              <Text style={s.statLabel}>Registered devices</Text>
            </View>
            <View style={s.statCard}>
              <Users color="#22C55E" size={18} />
              <Text style={s.statValue}>{members.length}</Text>
              <Text style={s.statLabel}>Total members</Text>
            </View>
            <View style={s.statCard}>
              <Bell color="#60A5FA" size={18} />
              <Text style={s.statValue}>{scheduledNotifications.filter((n) => n.enabled).length}</Text>
              <Text style={s.statLabel}>Active schedules</Text>
            </View>
          </View>
        </Panel>

        <Panel testID="notifications-send-panel">
          <SectionTitle copy="Compose and send a one-time push notification to members." title="Send notification" />

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Notification title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend Special!"
              placeholderTextColor="#8E6D56"
              style={s.input}
              testID="notifications-title-input"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Message body</Text>
            <TextInput
              multiline
              numberOfLines={4}
              value={body}
              onChangeText={setBody}
              placeholder="e.g. Visit us this weekend for 2x points on all orders!"
              placeholderTextColor="#8E6D56"
              style={[s.input, s.inputMultiline]}
              testID="notifications-body-input"
              textAlignVertical="top"
            />
            <Text style={s.charCount}>{body.length} characters</Text>
          </View>

          <View style={s.recipientModeRow}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setRecipientMode("all");
                setSelectedMemberIds(new Set());
                setMemberSearch("");
              }}
              style={({ pressed }) => [
                s.recipientModeBtn,
                recipientMode === "all" && s.recipientModeBtnActive,
                pressed && { opacity: 0.85 },
              ]}
              testID="notifications-mode-all"
            >
              <Users color={recipientMode === "all" ? "#1A120E" : "#C8AA94"} size={15} />
              <Text style={[s.recipientModeBtnText, recipientMode === "all" && s.recipientModeBtnTextActive]}>
                All ({tokenCount})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setRecipientMode("select");
              }}
              style={({ pressed }) => [
                s.recipientModeBtn,
                recipientMode === "select" && s.recipientModeBtnActive,
                pressed && { opacity: 0.85 },
              ]}
              testID="notifications-mode-select"
            >
              <Users color={recipientMode === "select" ? "#1A120E" : "#C8AA94"} size={15} />
              <Text style={[s.recipientModeBtnText, recipientMode === "select" && s.recipientModeBtnTextActive]}>
                Select{selectedMemberIds.size > 0 ? ` (${selectedMemberIds.size})` : ""}
              </Text>
            </Pressable>
          </View>

          {recipientMode === "select" && (
            <View style={s.memberSelectContainer}>
              <View style={s.memberSearchWrap}>
                <TextInput
                  value={memberSearch}
                  onChangeText={setMemberSearch}
                  placeholder="Search members with push enabled..."
                  placeholderTextColor="#8E6D56"
                  style={s.memberSearchInput}
                  testID="notifications-member-search"
                />
                {memberSearch.length > 0 && (
                  <Pressable onPress={() => setMemberSearch("")} hitSlop={8}>
                    <X color="#8E6D56" size={16} />
                  </Pressable>
                )}
              </View>

              <View style={s.memberSelectActions}>
                <Pressable
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedMemberIds((prev) => {
                      const next = new Set(prev);
                      for (const m of filteredMembers) next.add(m.id);
                      return next;
                    });
                  }}
                  style={({ pressed }) => [s.selectActionBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.selectActionText}>Select all</Text>
                </Pressable>
                {selectedMemberIds.size > 0 && (
                  <Pressable
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedMemberIds(new Set());
                    }}
                    style={({ pressed }) => [s.selectActionBtn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[s.selectActionText, { color: "#EF4444" }]}>Deselect all</Text>
                  </Pressable>
                )}
                <Text style={s.selectedCountText}>{selectedMemberIds.size} selected</Text>
              </View>

              <ScrollView style={s.memberSelectList} nestedScrollEnabled>
                {filteredMembers.length === 0 ? (
                  <Text style={s.emptyText}>
                    {memberSearch.trim() ? "No members match your search." : "No members with push tokens found."}
                  </Text>
                ) : (
                  filteredMembers.map((m) => {
                    const isChecked = selectedMemberIds.has(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggleMemberSelection(m.id)}
                        style={({ pressed }) => [
                          s.memberSelectRow,
                          isChecked && s.memberSelectRowChecked,
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View style={[s.memberCheckbox, isChecked && s.memberCheckboxChecked]}>
                          {isChecked && <Check color="#1A120E" size={13} strokeWidth={3} />}
                        </View>
                        <View style={s.memberSelectInfo}>
                          <Text style={s.memberSelectName} numberOfLines={1}>{m.fullName}</Text>
                          <Text style={s.memberSelectPhone}>{m.phone}</Text>
                        </View>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}

          <Pressable
            onPress={handleSend}
            disabled={isSending}
            style={({ pressed }) => [
              s.sendBtn,
              isSending && s.sendBtnDisabled,
              pressed && !isSending && { opacity: 0.85, transform: [{ scale: 0.985 }] },
            ]}
            testID="notifications-send-button"
          >
            {isSending ? (
              <ActivityIndicator color="#1A120E" size="small" />
            ) : (
              <Send color="#1A120E" size={16} />
            )}
            <Text style={s.sendBtnText}>
              {isSending
                ? "Sending..."
                : `Send to ${tokensForRecipients.length} device${tokensForRecipients.length !== 1 ? "s" : ""}`}
            </Text>
          </Pressable>
        </Panel>

        <Panel testID="notifications-scheduled-panel">
          <SectionTitle
            copy="Set up recurring push notifications that send automatically."
            title="Recurring notifications"
          />

          {isLoadingScheduled ? (
            <ActivityIndicator color="#F7C58B" size="small" />
          ) : (
            <>
              {scheduledNotifications.map((notif) => (
                <View key={notif.id} style={[s.schedCard, !notif.enabled && s.schedCardDisabled]}>
                  <View style={s.schedHeader}>
                    <View style={s.schedHeaderLeft}>
                      <View style={[s.schedIconWrap, { backgroundColor: notif.enabled ? "rgba(34, 197, 94, 0.12)" : "rgba(142, 109, 86, 0.12)" }]}>
                        <RefreshCw color={notif.enabled ? "#22C55E" : "#8E6D56"} size={16} />
                      </View>
                      <View style={s.schedHeaderText}>
                        <Text style={[s.schedTitle, !notif.enabled && { color: "#8E6D56" }]} numberOfLines={1}>
                          {notif.title}
                        </Text>
                        <Text style={s.schedFrequency}>{formatScheduleTime(notif)}</Text>
                      </View>
                    </View>
                    <Switch
                      value={notif.enabled}
                      onValueChange={(val) => handleToggleSchedule(notif.id, val)}
                      trackColor={{ false: "rgba(142, 109, 86, 0.3)", true: "rgba(34, 197, 94, 0.4)" }}
                      thumbColor={notif.enabled ? "#22C55E" : "#8E6D56"}
                    />
                  </View>
                  <Text style={s.schedBody} numberOfLines={2}>{notif.body}</Text>
                  <View style={s.schedMeta}>
                    <View style={s.schedMetaBadge}>
                      <Users color="#C8AA94" size={11} />
                      <Text style={s.schedMetaText}>
                        {notif.targetAudience === "opted_in" ? "Opted-in only" : "All devices"}
                      </Text>
                    </View>
                    {notif.lastSentAt && (
                      <View style={s.schedMetaBadge}>
                        <Clock color="#C8AA94" size={11} />
                        <Text style={s.schedMetaText}>
                          Last: {new Date(notif.lastSentAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={s.schedActions}>
                    <Pressable
                      onPress={() => void handleSendScheduledNow(notif)}
                      style={({ pressed }) => [s.schedActionBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Send color="#F7C58B" size={13} />
                      <Text style={s.schedActionBtnText}>Send now</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleEditSchedule(notif)}
                      style={({ pressed }) => [s.schedActionBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Edit3 color="#F7C58B" size={13} />
                      <Text style={s.schedActionBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteSchedule(notif.id)}
                      style={({ pressed }) => [s.schedActionBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Trash2 color="#EF4444" size={13} />
                      <Text style={[s.schedActionBtnText, { color: "#EF4444" }]}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {!showScheduleForm ? (
                <Pressable
                  onPress={() => {
                    resetScheduleForm();
                    if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowScheduleForm(true);
                  }}
                  style={({ pressed }) => [s.addScheduleBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}
                  testID="notifications-add-schedule"
                >
                  <Plus color="#F7C58B" size={18} />
                  <Text style={s.addScheduleBtnText}>Add recurring notification</Text>
                </Pressable>
              ) : (
                <View style={s.schedForm}>
                  <View style={s.schedFormHeader}>
                    <Text style={s.schedFormTitle}>
                      {editingScheduleId ? "Edit schedule" : "New recurring notification"}
                    </Text>
                    <Pressable
                      onPress={() => {
                        if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setShowScheduleForm(false);
                        resetScheduleForm();
                      }}
                      hitSlop={8}
                    >
                      <X color="#C8AA94" size={20} />
                    </Pressable>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Title</Text>
                    <TextInput
                      value={schedTitle}
                      onChangeText={setSchedTitle}
                      placeholder="e.g. Weekly Reminder"
                      placeholderTextColor="#8E6D56"
                      style={s.input}
                      testID="notifications-sched-title"
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Message</Text>
                    <TextInput
                      multiline
                      numberOfLines={3}
                      value={schedBody}
                      onChangeText={setSchedBody}
                      placeholder="e.g. Don't forget to visit us this week for great deals!"
                      placeholderTextColor="#8E6D56"
                      style={[s.input, s.inputMultiline, { minHeight: 80 }]}
                      testID="notifications-sched-body"
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Frequency</Text>
                    <View style={s.frequencyRow}>
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <Pressable
                          key={opt.id}
                          onPress={() => setSchedFrequency(opt.id)}
                          style={({ pressed }) => [
                            s.frequencyBtn,
                            schedFrequency === opt.id && s.frequencyBtnActive,
                            pressed && { opacity: 0.85 },
                          ]}
                        >
                          <Text style={[s.frequencyBtnText, schedFrequency === opt.id && s.frequencyBtnTextActive]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {schedFrequency === "weekly" && (
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Day of week</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayPicker}>
                        {DAYS_OF_WEEK.map((day, idx) => (
                          <Pressable
                            key={day}
                            onPress={() => setSchedDayOfWeek(idx)}
                            style={({ pressed }) => [
                              s.dayBtn,
                              schedDayOfWeek === idx && s.dayBtnActive,
                              pressed && { opacity: 0.85 },
                            ]}
                          >
                            <Text style={[s.dayBtnText, schedDayOfWeek === idx && s.dayBtnTextActive]}>
                              {day.substring(0, 3)}
                            </Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {schedFrequency === "monthly" && (
                    <View style={s.inputGroup}>
                      <Text style={s.inputLabel}>Day of month (1-28)</Text>
                      <TextInput
                        value={String(schedDayOfMonth)}
                        onChangeText={(v) => {
                          const num = parseInt(v, 10);
                          if (!isNaN(num) && num >= 1 && num <= 28) setSchedDayOfMonth(num);
                          else if (v === "") setSchedDayOfMonth(1);
                        }}
                        keyboardType="numeric"
                        style={s.input}
                        testID="notifications-sched-day-month"
                      />
                    </View>
                  )}

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Time (24h format)</Text>
                    <View style={s.timeRow}>
                      <TextInput
                        value={schedHour}
                        onChangeText={setSchedHour}
                        keyboardType="numeric"
                        placeholder="12"
                        placeholderTextColor="#8E6D56"
                        style={[s.input, s.timeInput]}
                        maxLength={2}
                        testID="notifications-sched-hour"
                      />
                      <Text style={s.timeColon}>:</Text>
                      <TextInput
                        value={schedMinute}
                        onChangeText={setSchedMinute}
                        keyboardType="numeric"
                        placeholder="00"
                        placeholderTextColor="#8E6D56"
                        style={[s.input, s.timeInput]}
                        maxLength={2}
                        testID="notifications-sched-minute"
                      />
                    </View>
                  </View>

                  <View style={s.inputGroup}>
                    <Text style={s.inputLabel}>Target audience</Text>
                    <View style={s.audienceRow}>
                      <Pressable
                        onPress={() => setSchedAudience("all")}
                        style={({ pressed }) => [
                          s.audienceBtn,
                          schedAudience === "all" && s.audienceBtnActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={[s.audienceBtnText, schedAudience === "all" && s.audienceBtnTextActive]}>
                          All devices
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setSchedAudience("opted_in")}
                        style={({ pressed }) => [
                          s.audienceBtn,
                          schedAudience === "opted_in" && s.audienceBtnActive,
                          pressed && { opacity: 0.85 },
                        ]}
                      >
                        <Text style={[s.audienceBtnText, schedAudience === "opted_in" && s.audienceBtnTextActive]}>
                          Opted-in only
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <Pressable
                    onPress={handleAddSchedule}
                    style={({ pressed }) => [s.sendBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] }]}
                    testID="notifications-save-schedule"
                  >
                    <Check color="#1A120E" size={16} />
                    <Text style={s.sendBtnText}>
                      {editingScheduleId ? "Save changes" : "Create schedule"}
                    </Text>
                  </Pressable>
                </View>
              )}

              <View style={s.schedHint}>
                <Calendar color="#F59E0B" size={13} />
                <Text style={s.schedHintText}>
                  Recurring notifications require a server-side cron job (e.g. Supabase pg_cron or a scheduled Edge Function) to trigger at the specified times. Configure this in your Supabase dashboard.
                </Text>
              </View>
            </>
          )}
        </Panel>

        <Panel testID="notifications-history-panel">
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setShowHistory((prev) => !prev);
            }}
            style={({ pressed }) => [s.historyToggle, pressed && { opacity: 0.8 }]}
            testID="notifications-history-toggle"
          >
            <Clock color="#F7C58B" size={16} />
            <Text style={s.historyToggleText}>
              Send history ({history.length})
            </Text>
            {showHistory ? <ChevronUp color="#C8AA94" size={16} /> : <ChevronDown color="#C8AA94" size={16} />}
          </Pressable>

          {showHistory && (
            <View style={s.historyList}>
              {history.length === 0 ? (
                <Text style={s.emptyText}>No notifications sent yet.</Text>
              ) : (
                history.slice(0, 20).map((entry) => (
                  <View key={entry.id} style={s.historyCard}>
                    <View style={s.historyHeader}>
                      <Text style={s.historyTitle} numberOfLines={1}>{entry.title}</Text>
                      <Text style={s.historyDate}>
                        {new Date(entry.sentAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Text style={s.historyBody} numberOfLines={2}>{entry.body}</Text>
                    <View style={s.historyStats}>
                      <Text style={s.historyStatText}>
                        {entry.sent} sent · {entry.failed} failed · {entry.recipientCount} total
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </Panel>

        <Panel testID="notifications-info-panel">
          <View style={s.infoNote}>
            <Bell color="#F59E0B" size={16} />
            <Text style={s.infoNoteText}>
              Push notifications are delivered to members who have the app installed and opened at least once on their device. Members must grant notification permissions for delivery.
            </Text>
          </View>
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const s = StyleSheet.create({
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
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
  statValue: {
    color: "#FFF7ED",
    fontSize: 20,
    fontWeight: "900" as const,
  },
  statLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  input: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    color: "#FFF7ED",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    lineHeight: 22,
    minHeight: 100,
    paddingTop: 12,
  },
  charCount: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "600" as const,
    textAlign: "right" as const,
  },
  recipientModeRow: {
    flexDirection: "row",
    gap: 10,
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
  memberSelectContainer: {
    gap: 10,
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
  memberSearchInput: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  memberSelectActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
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
  memberSelectList: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 220,
    paddingHorizontal: 6,
    paddingVertical: 6,
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
  memberSelectInfo: {
    flex: 1,
    gap: 1,
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
  sendBtn: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(247, 197, 139, 0.15)",
  },
  sendBtnText: {
    color: "#1A120E",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  schedCard: {
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  schedCardDisabled: {
    opacity: 0.6,
  },
  schedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  schedHeaderLeft: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
  },
  schedIconWrap: {
    alignItems: "center",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  schedHeaderText: {
    flex: 1,
    gap: 2,
  },
  schedTitle: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  schedFrequency: {
    color: "#C8AA94",
    fontSize: 12,
  },
  schedBody: {
    color: "#C8AA94",
    fontSize: 13,
    lineHeight: 18,
  },
  schedMeta: {
    flexDirection: "row",
    gap: 8,
  },
  schedMetaBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  schedMetaText: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  schedActions: {
    borderTopColor: "rgba(247, 197, 139, 0.08)",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 16,
    paddingTop: 10,
  },
  schedActionBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 2,
  },
  schedActionBtnText: {
    color: "#F7C58B",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  addScheduleBtn: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 16,
    borderStyle: "dashed" as const,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addScheduleBtnText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  schedForm: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  schedFormHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  schedFormTitle: {
    color: "#FFF7ED",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  frequencyRow: {
    flexDirection: "row",
    gap: 8,
  },
  frequencyBtn: {
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  frequencyBtnActive: {
    backgroundColor: "#F7C58B",
    borderColor: "#F7C58B",
  },
  frequencyBtnText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  frequencyBtnTextActive: {
    color: "#1A120E",
  },
  dayPicker: {
    flexDirection: "row",
  },
  dayBtn: {
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dayBtnActive: {
    backgroundColor: "#F7C58B",
    borderColor: "#F7C58B",
  },
  dayBtnText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  dayBtnTextActive: {
    color: "#1A120E",
  },
  timeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  timeInput: {
    flex: 1,
    textAlign: "center" as const,
  },
  timeColon: {
    color: "#FFF7ED",
    fontSize: 20,
    fontWeight: "800" as const,
  },
  audienceRow: {
    flexDirection: "row",
    gap: 8,
  },
  audienceBtn: {
    borderColor: "rgba(247, 197, 139, 0.15)",
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  audienceBtnActive: {
    backgroundColor: "#F7C58B",
    borderColor: "#F7C58B",
  },
  audienceBtnText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  audienceBtnTextActive: {
    color: "#1A120E",
  },
  schedHint: {
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
  schedHintText: {
    color: "#C8AA94",
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  historyToggle: {
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
  historyToggleText: {
    color: "#F7C58B",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 12,
  },
  historyHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  historyTitle: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  historyDate: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  historyBody: {
    color: "#C8AA94",
    fontSize: 12,
    lineHeight: 17,
  },
  historyStats: {
    flexDirection: "row",
  },
  historyStatText: {
    color: "#8E6D56",
    fontSize: 11,
    fontWeight: "600" as const,
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
  emptyText: {
    color: "#8E6D56",
    fontSize: 13,
    fontStyle: "italic" as const,
    paddingVertical: 8,
    textAlign: "center" as const,
  },
});
