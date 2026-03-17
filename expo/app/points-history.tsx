import { Stack } from "expo-router";
import { ArrowDownLeft, ArrowUpRight, Clock, Timer } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoyaltyScreen, Panel, SectionTitle } from "@/components/loyalty/ui";
import { useAuth } from "@/providers/auth-provider";
import { useMembersStore, type PointsEntry } from "@/providers/members-store-provider";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day}, ${year}`;
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function isExpired(entry: PointsEntry): boolean {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt) < new Date();
}

function daysUntilExpiry(entry: PointsEntry): number | null {
  if (!entry.expiresAt) return null;
  const diff = new Date(entry.expiresAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function EntryRow({ entry }: { entry: PointsEntry }) {
  const expired = entry.type === "earned" && isExpired(entry);
  const days = entry.type === "earned" ? daysUntilExpiry(entry) : null;
  const isEarned = entry.type === "earned";
  const expiringSoon = days !== null && days > 0 && days <= 30;

  return (
    <View style={[styles.entryRow, expired && styles.entryExpired]} testID={`entry-${entry.id}`}>
      <View style={[styles.entryIcon, isEarned ? styles.entryIconEarned : styles.entryIconRedeemed]}>
        {isEarned ? (
          <ArrowDownLeft color="#22C55E" size={16} />
        ) : (
          <ArrowUpRight color="#F87171" size={16} />
        )}
      </View>

      <View style={styles.entryBody}>
        <View style={styles.entryTopRow}>
          <Text style={[styles.entryTitle, expired && styles.entryTitleExpired]} numberOfLines={1}>
            {entry.note || (isEarned ? "Points earned" : "Points redeemed")}
          </Text>
          <Text style={[
            styles.entryAmount,
            isEarned ? styles.entryAmountEarned : styles.entryAmountRedeemed,
            expired && styles.entryAmountExpired,
          ]}>
            {isEarned ? "+" : "−"}{formatPoints(Math.abs(entry.amount))}
          </Text>
        </View>

        <View style={styles.entryMeta}>
          <View style={styles.entryMetaItem}>
            <Clock color="#8E6D56" size={11} />
            <Text style={styles.entryMetaText}>{formatDate(entry.addedAt)}</Text>
          </View>
          {isEarned && entry.expiresAt ? (
            <View style={styles.entryMetaItem}>
              <Timer color={expired ? "#EF4444" : expiringSoon ? "#F59E0B" : "#8E6D56"} size={11} />
              <Text style={[
                styles.entryMetaText,
                expired && styles.expiredText,
                expiringSoon && styles.expiringSoonText,
              ]}>
                {expired
                  ? "Expired"
                  : `Expires ${formatDate(entry.expiresAt)}`}
              </Text>
            </View>
          ) : null}
        </View>

        {expired ? (
          <View style={styles.expiredBadge}>
            <Text style={styles.expiredBadgeText}>EXPIRED</Text>
          </View>
        ) : expiringSoon ? (
          <View style={styles.expiringSoonBadge}>
            <Text style={styles.expiringSoonBadgeText}>
              {days === 1 ? "EXPIRES TOMORROW" : `EXPIRES IN ${days} DAYS`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function PointsHistoryScreen() {
  const { member } = useAuth();
  const { getMemberById, getActivePoints } = useMembersStore();

  const storedMember = useMemo(() => {
    if (!member?.id) return null;
    return getMemberById(member.id);
  }, [getMemberById, member?.id]);

  const activePoints = useMemo(() => {
    if (!member?.id) return 0;
    return getActivePoints(member.id);
  }, [getActivePoints, member?.id]);

  const history = useMemo(() => {
    return storedMember?.pointsHistory ?? [];
  }, [storedMember?.pointsHistory]);

  const earnedEntries = useMemo(() => history.filter((e) => e.type === "earned" || !e.type), [history]);
  const redeemedEntries = useMemo(() => history.filter((e) => e.type === "redeemed"), [history]);
  const expiredEntries = useMemo(() => earnedEntries.filter((e) => isExpired(e)), [earnedEntries]);

  const totalEarned = useMemo(() => earnedEntries.reduce((s, e) => s + e.amount, 0), [earnedEntries]);
  const totalRedeemed = useMemo(() => redeemedEntries.reduce((s, e) => s + Math.abs(e.amount), 0), [redeemedEntries]);
  const totalExpired = useMemo(() => expiredEntries.reduce((s, e) => s + e.amount, 0), [expiredEntries]);

  return (
    <>
      <Stack.Screen options={{ title: "Points history", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Points tracker"
        subtitle="Track when you earn and use points. Earned points expire one year after being awarded."
        title="Your points history."
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatPoints(activePoints)}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.earnedColor]}>{formatPoints(totalEarned)}</Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.redeemedColor]}>{formatPoints(totalRedeemed)}</Text>
            <Text style={styles.statLabel}>Redeemed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, styles.expiredColor]}>{formatPoints(totalExpired)}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>

        <Panel testID="points-expiry-info">
          <View style={styles.expiryNotice}>
            <Timer color="#F7C58B" size={18} />
            <Text style={styles.expiryNoticeText}>
              All earned points expire 1 year from the date they were awarded. Use your points before they expire!
            </Text>
          </View>
        </Panel>

        <Panel testID="points-history-panel">
          <SectionTitle
            copy={`${history.length} transaction${history.length !== 1 ? "s" : ""} recorded.`}
            title="All transactions"
          />
          {history.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock color="#8E6D56" size={32} />
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>
                Your points activity will appear here once staff adds points to your account.
              </Text>
            </View>
          ) : (
            history.map((entry) => (
              <EntryRow entry={entry} key={entry.id} />
            ))
          )}
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(20, 12, 10, 0.78)",
    borderColor: "rgba(247, 197, 139, 0.14)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingHorizontal: 6,
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
  earnedColor: {
    color: "#22C55E",
  },
  redeemedColor: {
    color: "#F87171",
  },
  expiredColor: {
    color: "#8E6D56",
  },
  expiryNotice: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  expiryNoticeText: {
    color: "#E7CDB8",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 19,
  },
  entryRow: {
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  entryExpired: {
    opacity: 0.55,
  },
  entryIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 36,
    justifyContent: "center",
    marginTop: 2,
    width: 36,
  },
  entryIconEarned: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  entryIconRedeemed: {
    backgroundColor: "rgba(248, 113, 113, 0.12)",
  },
  entryBody: {
    flex: 1,
    gap: 6,
  },
  entryTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  entryTitle: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  entryTitleExpired: {
    color: "#8E6D56",
    textDecorationLine: "line-through",
  },
  entryAmount: {
    fontSize: 15,
    fontWeight: "900" as const,
  },
  entryAmountEarned: {
    color: "#22C55E",
  },
  entryAmountRedeemed: {
    color: "#F87171",
  },
  entryAmountExpired: {
    color: "#8E6D56",
    textDecorationLine: "line-through",
  },
  entryMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  entryMetaItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  entryMetaText: {
    color: "#8E6D56",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  expiredText: {
    color: "#EF4444",
  },
  expiringSoonText: {
    color: "#F59E0B",
  },
  expiredBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expiredBadgeText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  expiringSoonBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  expiringSoonBadgeText: {
    color: "#F59E0B",
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: "#FFF7ED",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  emptySubtitle: {
    color: "#C8AA94",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
