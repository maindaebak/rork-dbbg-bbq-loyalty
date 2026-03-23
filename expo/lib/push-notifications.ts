import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  } as Notifications.NotificationBehavior),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("[PushNotifications] Web platform - skipping registration");
    return null;
  }

  if (!Device.isDevice) {
    console.log("[PushNotifications] Not a physical device - skipping registration");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      console.log("[PushNotifications] Requesting permission...");
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[PushNotifications] Permission not granted");
      return null;
    }

    const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
    console.log("[PushNotifications] Getting push token with projectId:", projectId);

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId ?? undefined,
    });

    console.log("[PushNotifications] Push token:", tokenData.data);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#F7C58B",
      });
      console.log("[PushNotifications] Android notification channel set");
    }

    return tokenData.data;
  } catch (err) {
    console.error("[PushNotifications] Registration error:", err);
    return null;
  }
}

export async function savePushToken(memberId: string, token: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn("[PushNotifications] Supabase not configured, cannot save token");
    return;
  }

  try {
    const { data: existing } = await supabase
      .from("push_tokens")
      .select("id")
      .eq("member_id", memberId)
      .eq("token", token)
      .maybeSingle();

    if (existing) {
      console.log("[PushNotifications] Token already saved for member", memberId);
      return;
    }

    const { error } = await supabase.from("push_tokens").upsert(
      {
        member_id: memberId,
        token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id" }
    );

    if (error) {
      console.error("[PushNotifications] Save token error:", error.message);
    } else {
      console.log("[PushNotifications] Token saved for member", memberId);
    }
  } catch (err) {
    console.error("[PushNotifications] Save token exception:", err);
  }
}

export async function getAllPushTokens(): Promise<{ memberId: string; token: string; platform: string }[]> {
  if (!isSupabaseConfigured()) {
    console.warn("[PushNotifications] Supabase not configured");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("push_tokens")
      .select("member_id, token, platform");

    if (error) {
      console.error("[PushNotifications] Fetch tokens error:", error.message);
      return [];
    }

    return (data ?? []).map((row: { member_id: string; token: string; platform: string }) => ({
      memberId: row.member_id,
      token: row.token,
      platform: row.platform,
    }));
  } catch (err) {
    console.error("[PushNotifications] Fetch tokens exception:", err);
    return [];
  }
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
): Promise<{ sent: number; failed: number }> {
  if (tokens.length === 0) {
    console.log("[PushNotifications] No tokens to send to");
    return { sent: 0, failed: 0 };
  }

  console.log("[PushNotifications] Sending to", tokens.length, "devices");

  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title,
    body,
    data: { type: "marketing" },
  }));

  const chunks: typeof messages[] = [];
  const CHUNK_SIZE = 100;
  for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
    chunks.push(messages.slice(i, i + CHUNK_SIZE));
  }

  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      console.log("[PushNotifications] Expo push response:", JSON.stringify(result).substring(0, 200));

      if (result.data) {
        for (const ticket of result.data) {
          if (ticket.status === "ok") {
            sent++;
          } else {
            failed++;
            console.warn("[PushNotifications] Ticket error:", ticket.message);
          }
        }
      }
    } catch (err) {
      console.error("[PushNotifications] Send chunk error:", err);
      failed += chunk.length;
    }
  }

  console.log("[PushNotifications] Results: sent=", sent, "failed=", failed);
  return { sent, failed };
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  minute: number;
  enabled: boolean;
  createdAt: string;
  lastSentAt?: string;
  targetAudience: "all" | "opted_in";
}
