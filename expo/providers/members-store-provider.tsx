import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { LoyaltyTier } from "@/constants/loyalty-program";
import { supabase } from "@/lib/supabase";

const MEMBERS_STORAGE_KEY = "dbbg-members-store";
const MEMBERSHIP_REDEMPTIONS_KEY = "dbbg-membership-redemptions";
const PERK_USAGES_KEY = "dbbg-perk-usages";

export interface MembershipRedemption {
  memberId: string;
  rewardId: string;
  redeemedAt: string;
}

export interface PerkUsage {
  memberId: string;
  perkId: string;
  usedAt: string;
}

export interface StoredMember {
  id: string;
  fullName: string;
  phone: string;
  birthdate: string;
  birthYear: string;
  createdAt: string;
  points: number;
  pointsHistory: PointsEntry[];
  marketingOptIn: boolean;
  pushNotificationOptIn: boolean;
  password?: string;
}

export type PointsEntryType = "earned" | "redeemed";

export interface PointsEntry {
  id: string;
  type: PointsEntryType;
  amount: number;
  dollarAmount: number;
  addedBy: string;
  addedAt: string;
  expiresAt: string;
  note: string;
}

interface DbMember {
  id: string;
  full_name: string;
  phone: string;
  birthdate: string | null;
  birth_year: string | null;
  points: number;
  created_at: string;
  auth_id: string | null;
  marketing_opt_in: boolean | null;
  push_notifications_enabled: boolean | null;
  password: string | null;
}

interface DbPointsEntry {
  id: string;
  member_id: string;
  type: string;
  amount: number;
  dollar_amount: number;
  added_by: string;
  note: string | null;
  expires_at: string | null;
  created_at: string;
}

function dbMemberToStored(member: DbMember, history: DbPointsEntry[]): StoredMember {
  return {
    id: member.id,
    fullName: member.full_name,
    phone: member.phone,
    birthdate: member.birthdate ?? "",
    birthYear: member.birth_year ?? "",
    createdAt: member.created_at,
    points: member.points,
    pointsHistory: history.map((entry) => ({
      id: entry.id,
      type: entry.type as PointsEntryType,
      amount: entry.amount,
      dollarAmount: entry.dollar_amount,
      addedBy: entry.added_by,
      addedAt: entry.created_at,
      expiresAt: entry.expires_at ?? "",
      note: entry.note ?? "",
    })),
    marketingOptIn: member.marketing_opt_in ?? false,
    pushNotificationOptIn: member.push_notifications_enabled ?? true,
    password: member.password ?? undefined,
  };
}

async function fetchMembersFromSupabase(): Promise<StoredMember[]> {
  try {
    console.log("[MembersStore] Fetching members from Supabase...");
    const { data: dbMembers, error: membersError } = await supabase
      .from("members")
      .select("*")
      .order("created_at", { ascending: false });

    if (membersError) {
      console.error("[MembersStore] Supabase members error:", membersError.message);
      throw membersError;
    }

    if (!dbMembers || dbMembers.length === 0) {
      console.log("[MembersStore] No members found in Supabase");
      return [];
    }

    const memberIds = dbMembers.map((m: DbMember) => m.id);
    const { data: dbHistory, error: historyError } = await supabase
      .from("points_history")
      .select("*")
      .in("member_id", memberIds)
      .order("created_at", { ascending: false });

    if (historyError) {
      console.error("[MembersStore] Supabase history error:", historyError.message);
    }

    const historyByMember = new Map<string, DbPointsEntry[]>();
    for (const entry of (dbHistory ?? []) as DbPointsEntry[]) {
      const existing = historyByMember.get(entry.member_id) ?? [];
      existing.push(entry);
      historyByMember.set(entry.member_id, existing);
    }

    const members = (dbMembers as DbMember[]).map((m) =>
      dbMemberToStored(m, historyByMember.get(m.id) ?? [])
    );

    console.log("[MembersStore] Loaded", members.length, "members from Supabase");
    return members;
  } catch (err) {
    console.error("[MembersStore] Failed to fetch from Supabase, falling back to local:", err);
    const raw = await AsyncStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StoredMember[];
    } catch {
      return [];
    }
  }
}

async function fetchMembershipRedemptions(): Promise<MembershipRedemption[]> {
  try {
    console.log("[MembersStore] Fetching membership redemptions from Supabase...");
    const { data, error } = await supabase
      .from("membership_redemptions")
      .select("*");

    if (error) {
      console.error("[MembersStore] Supabase membership_redemptions error:", error.message);
      throw error;
    }

    return (data ?? []).map((r: { member_id: string; reward_id: string; redeemed_at: string }) => ({
      memberId: r.member_id,
      rewardId: r.reward_id,
      redeemedAt: r.redeemed_at,
    }));
  } catch (err) {
    console.warn("[MembersStore] Falling back to local for membership redemptions", err);
    const raw = await AsyncStorage.getItem(MEMBERSHIP_REDEMPTIONS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as MembershipRedemption[];
    } catch {
      return [];
    }
  }
}

function getTodayStr(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

async function fetchPerkUsages(): Promise<PerkUsage[]> {
  try {
    console.log("[MembersStore] Fetching perk usages from Supabase...");
    const todayStr = getTodayStr();
    const startOfDay = `${todayStr}T00:00:00.000Z`;
    const endOfDay = `${todayStr}T23:59:59.999Z`;

    const { data, error } = await supabase
      .from("perk_usages")
      .select("*")
      .gte("used_at", startOfDay)
      .lte("used_at", endOfDay);

    if (error) {
      console.error("[MembersStore] Supabase perk_usages error:", error.message);
      throw error;
    }

    return (data ?? []).map((r: { member_id: string; perk_id: string; used_at: string }) => ({
      memberId: r.member_id,
      perkId: r.perk_id,
      usedAt: r.used_at,
    }));
  } catch (err) {
    console.warn("[MembersStore] Falling back to local for perk usages", err);
    const raw = await AsyncStorage.getItem(PERK_USAGES_KEY);
    if (!raw) return [];
    try {
      const all = JSON.parse(raw) as PerkUsage[];
      const todayStr = getTodayStr();
      return all.filter((p) => {
        const d = new Date(p.usedAt);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dStr === todayStr;
      });
    } catch {
      return [];
    }
  }
}

export const [MembersStoreProvider, useMembersStore] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<StoredMember[]>([]);
  const [membershipRedemptions, setMembershipRedemptions] = useState<MembershipRedemption[]>([]);
  const [perkUsages, setPerkUsages] = useState<PerkUsage[]>([]);

  const redemptionsQuery = useQuery({
    queryKey: ["membership-redemptions"],
    queryFn: fetchMembershipRedemptions,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (redemptionsQuery.data) {
      setMembershipRedemptions(redemptionsQuery.data);
    }
  }, [redemptionsQuery.data]);

  const perkUsagesQuery = useQuery({
    queryKey: ["perk-usages"],
    queryFn: fetchPerkUsages,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (perkUsagesQuery.data) {
      setPerkUsages(perkUsagesQuery.data);
    }
  }, [perkUsagesQuery.data]);

  const membersQuery = useQuery({
    queryKey: ["members-store"],
    queryFn: fetchMembersFromSupabase,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (membersQuery.data) {
      setMembers(membersQuery.data);
    }
  }, [membersQuery.data]);

  const registerMemberMutation = useMutation({
    mutationFn: async (member: Omit<StoredMember, "points" | "pointsHistory">) => {
      console.log("[MembersStore] Registering member in Supabase:", member.fullName);

      const { data: existing, error: selectError } = await supabase
        .from("members")
        .select("*")
        .eq("phone", member.phone)
        .maybeSingle();

      if (selectError) {
        console.error("[MembersStore] Select existing member error:", selectError.message, selectError.code, selectError.details);
      }

      if (existing) {
        console.log("[MembersStore] Member already exists with phone", member.phone);
        return dbMemberToStored(existing as DbMember, []);
      }

      const { data: authUser } = await supabase.auth.getUser();
      console.log("[MembersStore] Auth user for insert:", authUser?.user?.id ?? "none");

      const insertPayload = {
        full_name: member.fullName,
        phone: member.phone,
        birthdate: member.birthdate || null,
        birth_year: member.birthYear || null,
        auth_id: authUser?.user?.id ?? null,
        marketing_opt_in: member.marketingOptIn ?? false,
        password: member.password || null,
      };
      console.log("[MembersStore] Insert payload:", JSON.stringify(insertPayload));

      const { data: inserted, error } = await supabase
        .from("members")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error("[MembersStore] Insert error:", error.message, "code:", error.code, "details:", error.details, "hint:", error.hint);
        throw new Error(error.message);
      }

      console.log("[MembersStore] Registered member successfully:", inserted.id);
      return dbMemberToStored(inserted as DbMember, []);
    },
    onSuccess: () => {
      console.log("[MembersStore] Register mutation succeeded, invalidating queries");
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
    onError: (error) => {
      console.error("[MembersStore] Register mutation FAILED:", error.message);
    },
  });

  const registerMember = useCallback(
    async (member: Omit<StoredMember, "points" | "pointsHistory">): Promise<StoredMember> => {
      const existing = members.find(
        (m) => m.phone.replace(/\D/g, "") === member.phone.replace(/\D/g, "")
      );
      if (existing) {
        console.log("[MembersStore] Member already exists locally");
        return existing;
      }

      console.log("[MembersStore] Registering member (awaiting Supabase):", member.fullName);
      const result = await registerMemberMutation.mutateAsync(member);
      console.log("[MembersStore] Register mutation completed, member id:", result.id);
      return result;
    },
    [members, registerMemberMutation],
  );

  const findMemberByPhone = useCallback(
    (phone: string): StoredMember | undefined => {
      const digits = phone.replace(/\D/g, "");
      return members.find((m) => m.phone.replace(/\D/g, "") === digits);
    },
    [members],
  );

  const getMemberById = useCallback(
    (id: string): StoredMember | undefined => {
      return members.find((m) => m.id === id);
    },
    [members],
  );

  const getActivePoints = useCallback(
    (memberId: string): number => {
      const member = members.find((m) => m.id === memberId);
      if (!member) return 0;
      const now = new Date().toISOString();
      let total = 0;
      for (const entry of member.pointsHistory) {
        if (entry.type === "redeemed") {
          total -= Math.abs(entry.amount);
        } else {
          if (entry.expiresAt && entry.expiresAt < now) continue;
          total += entry.amount;
        }
      }
      return Math.max(0, total);
    },
    [members],
  );

  const addPointsMutation = useMutation({
    mutationFn: async ({
      memberId,
      dollarAmount,
      pointsPerDollar,
      note,
      tierBonusPoints,
      tierBonusName,
    }: {
      memberId: string;
      dollarAmount: number;
      pointsPerDollar: number;
      note: string;
      tierBonusPoints?: number;
      tierBonusName?: string;
    }) => {
      const pointsToAdd = Math.round(dollarAmount * pointsPerDollar);
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      const { error: historyError } = await supabase.from("points_history").insert({
        member_id: memberId,
        type: "earned",
        amount: pointsToAdd,
        dollar_amount: dollarAmount,
        added_by: "admin",
        note,
        expires_at: expiresAt.toISOString(),
      });

      if (historyError) {
        console.error("[MembersStore] Add points history error:", historyError.message);
        throw new Error(historyError.message);
      }

      const member = members.find((m) => m.id === memberId);
      let newTotal = (member?.points ?? 0) + pointsToAdd;

      if (tierBonusPoints && tierBonusPoints > 0) {
        const bonusExpiresAt = new Date();
        bonusExpiresAt.setFullYear(bonusExpiresAt.getFullYear() + 1);

        const { error: bonusError } = await supabase.from("points_history").insert({
          member_id: memberId,
          type: "earned",
          amount: tierBonusPoints,
          dollar_amount: 0,
          added_by: "system",
          note: `Tier bonus: Reached ${tierBonusName ?? "new tier"}`,
          expires_at: bonusExpiresAt.toISOString(),
        });

        if (bonusError) {
          console.error("[MembersStore] Tier bonus history error:", bonusError.message);
        } else {
          newTotal += tierBonusPoints;
          console.log("[MembersStore] Awarded", tierBonusPoints, "tier bonus points for reaching", tierBonusName);
        }
      }

      const { error: updateError } = await supabase
        .from("members")
        .update({ points: newTotal })
        .eq("id", memberId);

      if (updateError) {
        console.error("[MembersStore] Update points error:", updateError.message);
      }

      console.log("[MembersStore] Added", pointsToAdd, "points to member", memberId);
      return pointsToAdd;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
  });

  const addPoints = useCallback(
    (
      memberId: string,
      dollarAmount: number,
      pointsPerDollar: number,
      note: string,
      tierConfig?: { tiers: LoyaltyTier[]; tierBonusEnabled: boolean },
    ) => {
      const pointsToAdd = Math.round(dollarAmount * pointsPerDollar);
      let tierBonusPoints = 0;
      let tierBonusName = "";

      const member = members.find((m) => m.id === memberId);
      if (member && tierConfig?.tierBonusEnabled && tierConfig.tiers.length > 0) {
        const sortedTiers = [...tierConfig.tiers].sort((a, b) => a.minPoints - b.minPoints);
        const oldPoints = member.points;
        const newPoints = oldPoints + pointsToAdd;

        const oldTier = sortedTiers.reduce<LoyaltyTier | null>((active, tier) => {
          if (oldPoints >= tier.minPoints) return tier;
          return active;
        }, null);

        const newTier = sortedTiers.reduce<LoyaltyTier | null>((active, tier) => {
          if (newPoints >= tier.minPoints) return tier;
          return active;
        }, null);

        const isUpgrade = newTier && (
          !oldTier || newTier.minPoints > oldTier.minPoints
        );

        const alreadyReceivedBonus = newTier ? member.pointsHistory.some(
          (entry) => entry.addedBy === "system" && entry.note === `Tier bonus: Reached ${newTier.name}`
        ) : false;

        if (isUpgrade && newTier && !alreadyReceivedBonus && (newTier.bonusPoints ?? 0) > 0) {
          tierBonusPoints = newTier.bonusPoints ?? 0;
          tierBonusName = newTier.name;
          console.log("[MembersStore] Tier upgrade detected:", oldTier?.name ?? "none", "->", newTier.name, "bonus:", tierBonusPoints);
        } else if (newTier && alreadyReceivedBonus) {
          console.log("[MembersStore] Tier bonus for", newTier.name, "already received, skipping");
        }
      }

      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            const entries: PointsEntry[] = [];
            entries.push({
              id: `pts-${Date.now()}`,
              type: "earned",
              amount: pointsToAdd,
              dollarAmount,
              addedBy: "admin",
              addedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              note,
            });
            if (tierBonusPoints > 0) {
              entries.push({
                id: `pts-bonus-${Date.now()}`,
                type: "earned",
                amount: tierBonusPoints,
                dollarAmount: 0,
                addedBy: "system",
                addedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                note: `Tier bonus: Reached ${tierBonusName}`,
              });
            }
            return {
              ...m,
              points: m.points + pointsToAdd + tierBonusPoints,
              pointsHistory: [...entries, ...m.pointsHistory],
            };
          }
          return m;
        })
      );
      addPointsMutation.mutate({
        memberId,
        dollarAmount,
        pointsPerDollar,
        note,
        tierBonusPoints: tierBonusPoints > 0 ? tierBonusPoints : undefined,
        tierBonusName: tierBonusName || undefined,
      });
      return pointsToAdd + tierBonusPoints;
    },
    [addPointsMutation, members],
  );

  const removePointsMutation = useMutation({
    mutationFn: async ({
      memberId,
      pointsAmount,
      note,
    }: {
      memberId: string;
      pointsAmount: number;
      note: string;
    }) => {
      const { error: historyError } = await supabase.from("points_history").insert({
        member_id: memberId,
        type: "redeemed",
        amount: pointsAmount,
        dollar_amount: 0,
        added_by: "admin",
        note,
      });

      if (historyError) {
        console.error("[MembersStore] Remove points history error:", historyError.message);
        throw new Error(historyError.message);
      }

      const member = members.find((m) => m.id === memberId);
      const newTotal = Math.max(0, (member?.points ?? 0) - pointsAmount);

      const { error: updateError } = await supabase
        .from("members")
        .update({ points: newTotal })
        .eq("id", memberId);

      if (updateError) {
        console.error("[MembersStore] Update points error:", updateError.message);
      }

      console.log("[MembersStore] Removed", pointsAmount, "points from member", memberId);
      return pointsAmount;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
  });

  const removePoints = useCallback(
    (memberId: string, pointsAmount: number, note: string) => {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            const entry: PointsEntry = {
              id: `pts-${Date.now()}`,
              type: "redeemed",
              amount: pointsAmount,
              dollarAmount: 0,
              addedBy: "admin",
              addedAt: new Date().toISOString(),
              expiresAt: "",
              note,
            };
            return {
              ...m,
              points: Math.max(0, m.points - pointsAmount),
              pointsHistory: [entry, ...m.pointsHistory],
            };
          }
          return m;
        })
      );
      removePointsMutation.mutate({ memberId, pointsAmount, note });
      return pointsAmount;
    },
    [removePointsMutation],
  );

  const updateMemberMutation = useMutation({
    mutationFn: async ({
      memberId,
      updates,
    }: {
      memberId: string;
      updates: Partial<Pick<StoredMember, "fullName" | "phone" | "birthdate" | "birthYear" | "marketingOptIn" | "pushNotificationOptIn">>;
    }) => {
      const dbUpdates: Record<string, string | boolean | null> = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.birthdate !== undefined) dbUpdates.birthdate = updates.birthdate || null;
      if (updates.birthYear !== undefined) dbUpdates.birth_year = updates.birthYear || null;
      if (updates.marketingOptIn !== undefined) dbUpdates.marketing_opt_in = updates.marketingOptIn;
      if (updates.pushNotificationOptIn !== undefined) dbUpdates.push_notifications_enabled = updates.pushNotificationOptIn;
      if ((updates as Record<string, unknown>).password !== undefined) dbUpdates.password = (updates as Record<string, unknown>).password as string;

      const { error } = await supabase
        .from("members")
        .update(dbUpdates)
        .eq("id", memberId);

      if (error) {
        console.error("[MembersStore] Update member error:", error.message);
        throw new Error(error.message);
      }

      console.log("[MembersStore] Updated member", memberId, updates);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
  });

  const updateMemberContact = useCallback(
    (memberId: string, updates: Partial<Pick<StoredMember, "phone">>) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
      );
      updateMemberMutation.mutate({ memberId, updates });
    },
    [updateMemberMutation],
  );

  const updateMemberProfile = useCallback(
    (memberId: string, updates: Partial<Pick<StoredMember, "fullName" | "phone" | "birthdate" | "birthYear" | "marketingOptIn" | "pushNotificationOptIn">>) => {
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
      );
      updateMemberMutation.mutate({ memberId, updates });
    },
    [updateMemberMutation],
  );

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("members").delete().eq("id", memberId);
      if (error) {
        console.error("[MembersStore] Delete member error:", error.message);
        throw new Error(error.message);
      }
      console.log("[MembersStore] Deleted member", memberId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
  });

  const deleteMember = useCallback(
    (memberId: string) => {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      deleteMemberMutation.mutate(memberId);
    },
    [deleteMemberMutation],
  );

  const unclaimMembershipRewardMutation = useMutation({
    mutationFn: async ({ memberId, rewardId }: { memberId: string; rewardId: string }) => {
      console.log("[MembersStore] Unclaiming membership reward", rewardId, "for member", memberId);
      const { error } = await supabase
        .from("membership_redemptions")
        .delete()
        .eq("member_id", memberId)
        .eq("reward_id", rewardId);

      if (error) {
        console.error("[MembersStore] Supabase unclaim membership reward error:", error.message);
        const updated = membershipRedemptions.filter(
          (r) => !(r.memberId === memberId && r.rewardId === rewardId)
        );
        await AsyncStorage.setItem(MEMBERSHIP_REDEMPTIONS_KEY, JSON.stringify(updated));
        console.log("[MembersStore] Saved unclaim to local fallback");
      } else {
        console.log("[MembersStore] Unclaimed membership reward from Supabase");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["membership-redemptions"] });
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
  });

  const redeemMembershipRewardMutation = useMutation({
    mutationFn: async ({ memberId, rewardId }: { memberId: string; rewardId: string }) => {
      console.log("[MembersStore] Redeeming membership reward", rewardId, "for member", memberId);
      const redemption = {
        member_id: memberId,
        reward_id: rewardId,
        redeemed_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("membership_redemptions").insert(redemption);

      if (error) {
        console.error("[MembersStore] Supabase membership redemption error:", error.message);
        const updated = [...membershipRedemptions, { memberId, rewardId, redeemedAt: redemption.redeemed_at }];
        await AsyncStorage.setItem(MEMBERSHIP_REDEMPTIONS_KEY, JSON.stringify(updated));
        console.log("[MembersStore] Saved membership redemption to local fallback");
      } else {
        console.log("[MembersStore] Saved membership redemption to Supabase");
      }

      return { memberId, rewardId, redeemedAt: redemption.redeemed_at };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["membership-redemptions"] });
    },
  });

  const hasMemberRedeemedAnyRewardToday = useCallback(
    (memberId: string): boolean => {
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return membershipRedemptions.some((r) => {
        if (r.memberId !== memberId) return false;
        const rDate = new Date(r.redeemedAt);
        const rStr = `${rDate.getFullYear()}-${String(rDate.getMonth() + 1).padStart(2, "0")}-${String(rDate.getDate()).padStart(2, "0")}`;
        return rStr === todayStr;
      });
    },
    [membershipRedemptions],
  );

  const redeemMembershipReward = useCallback(
    (memberId: string, rewardId: string, rewardTitle?: string) => {
      const already = membershipRedemptions.some(
        (r) => r.memberId === memberId && r.rewardId === rewardId
      );
      if (already) {
        console.log("[MembersStore] Membership reward already redeemed");
        return "already_redeemed" as const;
      }

      if (hasMemberRedeemedAnyRewardToday(memberId)) {
        console.log("[MembersStore] Member already redeemed a membership reward today");
        return "daily_limit" as const;
      }

      const optimistic: MembershipRedemption = {
        memberId,
        rewardId,
        redeemedAt: new Date().toISOString(),
      };
      setMembershipRedemptions((prev) => [...prev, optimistic]);
      redeemMembershipRewardMutation.mutate({ memberId, rewardId });

      const rewardLabel = rewardTitle ? `Membership reward claimed: ${rewardTitle}` : `Membership reward claimed`;
      const visitEntry: PointsEntry = {
        id: `pts-membership-${Date.now()}`,
        type: "earned",
        amount: 0,
        dollarAmount: 0,
        addedBy: "system",
        addedAt: new Date().toISOString(),
        expiresAt: "",
        note: rewardLabel,
      };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, pointsHistory: [visitEntry, ...m.pointsHistory] }
            : m
        )
      );

      const recordVisit = async () => {
        try {
          await supabase.from("points_history").insert({
            member_id: memberId,
            type: "earned",
            amount: 0,
            dollar_amount: 0,
            added_by: "system",
            note: rewardLabel,
            expires_at: null,
          });
          console.log("[MembersStore] Recorded membership reward visit for member", memberId);
        } catch (err) {
          console.error("[MembersStore] Failed to record membership visit:", err);
        }
      };
      void recordVisit();

      return "success" as const;
    },
    [membershipRedemptions, redeemMembershipRewardMutation, hasMemberRedeemedAnyRewardToday],
  );

  const markPerkUsedMutation = useMutation({
    mutationFn: async ({ memberId, perkId }: { memberId: string; perkId: string }) => {
      console.log("[MembersStore] Marking perk", perkId, "as used for member", memberId);
      const usedAt = new Date().toISOString();
      const { error } = await supabase.from("perk_usages").insert({
        member_id: memberId,
        perk_id: perkId,
        used_at: usedAt,
      });

      if (error) {
        console.error("[MembersStore] Supabase perk_usages insert error:", error.message);
        const updated = [...perkUsages, { memberId, perkId, usedAt }];
        await AsyncStorage.setItem(PERK_USAGES_KEY, JSON.stringify(updated));
        console.log("[MembersStore] Saved perk usage to local fallback");
      } else {
        console.log("[MembersStore] Saved perk usage to Supabase");
      }

      return { memberId, perkId, usedAt };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["perk-usages"] });
    },
  });

  const unmarkPerkUsedMutation = useMutation({
    mutationFn: async ({ memberId, perkId }: { memberId: string; perkId: string }) => {
      console.log("[MembersStore] Unmarking perk", perkId, "for member", memberId);
      const todayStr = getTodayStr();
      const startOfDay = `${todayStr}T00:00:00.000Z`;
      const endOfDay = `${todayStr}T23:59:59.999Z`;

      const { error } = await supabase
        .from("perk_usages")
        .delete()
        .eq("member_id", memberId)
        .eq("perk_id", perkId)
        .gte("used_at", startOfDay)
        .lte("used_at", endOfDay);

      if (error) {
        console.error("[MembersStore] Supabase perk_usages delete error:", error.message);
        const updated = perkUsages.filter(
          (p) => !(p.memberId === memberId && p.perkId === perkId)
        );
        await AsyncStorage.setItem(PERK_USAGES_KEY, JSON.stringify(updated));
      } else {
        console.log("[MembersStore] Deleted perk usage from Supabase");
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["perk-usages"] });
    },
  });

  const hasMemberUsedPerkToday = useCallback(
    (memberId: string, perkId: string): boolean => {
      const todayStr = getTodayStr();
      return perkUsages.some((p) => {
        if (p.memberId !== memberId || p.perkId !== perkId) return false;
        const d = new Date(p.usedAt);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dStr === todayStr;
      });
    },
    [perkUsages],
  );

  const getMemberPerkUsagesToday = useCallback(
    (memberId: string): PerkUsage[] => {
      const todayStr = getTodayStr();
      return perkUsages.filter((p) => {
        if (p.memberId !== memberId) return false;
        const d = new Date(p.usedAt);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dStr === todayStr;
      });
    },
    [perkUsages],
  );

  const markPerkUsed = useCallback(
    (memberId: string, perkId: string, perkTitle?: string) => {
      const already = hasMemberUsedPerkToday(memberId, perkId);
      if (already) {
        console.log("[MembersStore] Perk already used today");
        return;
      }
      const optimistic: PerkUsage = {
        memberId,
        perkId,
        usedAt: new Date().toISOString(),
      };
      setPerkUsages((prev) => [...prev, optimistic]);
      markPerkUsedMutation.mutate({ memberId, perkId });

      const perkLabel = perkTitle ? `Membership perk used: ${perkTitle}` : `Membership perk used`;
      const perkEntry: PointsEntry = {
        id: `pts-perk-${Date.now()}`,
        type: "earned",
        amount: 0,
        dollarAmount: 0,
        addedBy: "system",
        addedAt: new Date().toISOString(),
        expiresAt: "",
        note: perkLabel,
      };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, pointsHistory: [perkEntry, ...m.pointsHistory] }
            : m
        )
      );

      const recordPerkUsage = async () => {
        try {
          await supabase.from("points_history").insert({
            member_id: memberId,
            type: "earned",
            amount: 0,
            dollar_amount: 0,
            added_by: "system",
            note: perkLabel,
            expires_at: null,
          });
          console.log("[MembersStore] Recorded perk usage for member", memberId);
        } catch (err) {
          console.error("[MembersStore] Failed to record perk usage:", err);
        }
      };
      void recordPerkUsage();

      console.log("[MembersStore] Marked perk", perkId, "as used for", memberId);
    },
    [hasMemberUsedPerkToday, markPerkUsedMutation],
  );

  const unmarkPerkUsed = useCallback(
    (memberId: string, perkId: string, perkTitle?: string) => {
      setPerkUsages((prev) =>
        prev.filter((p) => !(p.memberId === memberId && p.perkId === perkId))
      );
      unmarkPerkUsedMutation.mutate({ memberId, perkId });

      const unmarkLabel = perkTitle ? `Membership perk unclaimed: ${perkTitle}` : `Membership perk unclaimed`;
      const unmarkEntry: PointsEntry = {
        id: `pts-perk-unclaim-${Date.now()}`,
        type: "redeemed",
        amount: 0,
        dollarAmount: 0,
        addedBy: "system",
        addedAt: new Date().toISOString(),
        expiresAt: "",
        note: unmarkLabel,
      };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, pointsHistory: [unmarkEntry, ...m.pointsHistory] }
            : m
        )
      );

      const recordPerkUnclaim = async () => {
        try {
          await supabase.from("points_history").insert({
            member_id: memberId,
            type: "redeemed",
            amount: 0,
            dollar_amount: 0,
            added_by: "system",
            note: unmarkLabel,
            expires_at: null,
          });
          console.log("[MembersStore] Recorded perk unclaim for member", memberId);
        } catch (err) {
          console.error("[MembersStore] Failed to record perk unclaim:", err);
        }
      };
      void recordPerkUnclaim();

      console.log("[MembersStore] Unmarked perk", perkId, "for", memberId);
    },
    [unmarkPerkUsedMutation],
  );

  const loginWithPassword = useCallback(
    async (phone: string, password: string): Promise<{ success: boolean; member?: StoredMember; error?: string }> => {
      const digits = phone.replace(/\D/g, "");
      console.log("[MembersStore] Attempting password login for phone:", digits);

      const localMember = members.find((m) => m.phone.replace(/\D/g, "") === digits);
      if (localMember) {
        if (localMember.password === password) {
          console.log("[MembersStore] Local password match for", localMember.fullName);
          return { success: true, member: localMember };
        }
      }

      try {
        const { data, error } = await supabase
          .from("members")
          .select("*")
          .eq("phone", phone)
          .maybeSingle();

        if (error) {
          console.error("[MembersStore] Supabase login query error:", error.message);
          if (localMember) {
            return { success: false, error: "Incorrect password. Please try again." };
          }
          return { success: false, error: "Unable to verify credentials. Please try again." };
        }

        if (!data) {
          return { success: false, error: "No account found with this phone number. Please sign up first." };
        }

        const dbMember = data as DbMember;
        if (dbMember.password !== password) {
          return { success: false, error: "Incorrect password. Please try again." };
        }

        const stored = dbMemberToStored(dbMember, []);
        console.log("[MembersStore] Supabase password match for", stored.fullName);
        return { success: true, member: stored };
      } catch (err) {
        console.error("[MembersStore] Login error:", err);
        if (localMember) {
          return { success: false, error: "Incorrect password. Please try again." };
        }
        return { success: false, error: "Unable to verify credentials. Please check your connection." };
      }
    },
    [members],
  );

  const updateMemberPassword = useCallback(
    async (phone: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      console.log("[MembersStore] Updating password for phone:", phone);
      try {
        const { error } = await supabase
          .from("members")
          .update({ password: newPassword })
          .eq("phone", phone);

        if (error) {
          console.error("[MembersStore] Password update error:", error.message);
          setMembers((prev) =>
            prev.map((m) =>
              m.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
                ? { ...m, password: newPassword }
                : m
            )
          );
          return { success: true };
        }

        setMembers((prev) =>
          prev.map((m) =>
            m.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
              ? { ...m, password: newPassword }
              : m
          )
        );
        console.log("[MembersStore] Password updated successfully");
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[MembersStore] Password update exception:", msg);
        return { success: false, error: msg };
      }
    },
    [],
  );

  const unclaimMembershipReward = useCallback(
    (memberId: string, rewardId: string, rewardTitle?: string) => {
      setMembershipRedemptions((prev) =>
        prev.filter((r) => !(r.memberId === memberId && r.rewardId === rewardId))
      );
      unclaimMembershipRewardMutation.mutate({ memberId, rewardId });

      const unclaimLabel = rewardTitle ? `Membership reward unclaimed: ${rewardTitle}` : `Membership reward unclaimed`;
      const unclaimEntry: PointsEntry = {
        id: `pts-unclaim-${Date.now()}`,
        type: "redeemed",
        amount: 0,
        dollarAmount: 0,
        addedBy: "system",
        addedAt: new Date().toISOString(),
        expiresAt: "",
        note: unclaimLabel,
      };
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, pointsHistory: [unclaimEntry, ...m.pointsHistory] }
            : m
        )
      );

      const recordUnclaim = async () => {
        try {
          await supabase.from("points_history").insert({
            member_id: memberId,
            type: "redeemed",
            amount: 0,
            dollar_amount: 0,
            added_by: "system",
            note: unclaimLabel,
            expires_at: null,
          });
          console.log("[MembersStore] Recorded membership reward unclaim for member", memberId);
        } catch (err) {
          console.error("[MembersStore] Failed to record membership unclaim:", err);
        }
      };
      void recordUnclaim();

      console.log("[MembersStore] Unclaimed membership reward", rewardId, "for", memberId);
    },
    [unclaimMembershipRewardMutation],
  );

  const hasMemberRedeemedReward = useCallback(
    (memberId: string, rewardId: string): boolean => {
      return membershipRedemptions.some(
        (r) => r.memberId === memberId && r.rewardId === rewardId
      );
    },
    [membershipRedemptions],
  );

  const getMemberRedemptions = useCallback(
    (memberId: string): MembershipRedemption[] => {
      return membershipRedemptions.filter((r) => r.memberId === memberId);
    },
    [membershipRedemptions],
  );

  return useMemo(
    () => ({
      members,
      isLoading: membersQuery.isLoading,
      registerMember,
      findMemberByPhone,
      getMemberById,
      getActivePoints,
      addPoints,
      removePoints,
      updateMemberContact,
      updateMemberProfile,
      deleteMember,
      membershipRedemptions,
      redeemMembershipReward,
      unclaimMembershipReward,
      hasMemberRedeemedReward,
      hasMemberRedeemedAnyRewardToday,
      getMemberRedemptions,
      perkUsages,
      markPerkUsed,
      unmarkPerkUsed,
      hasMemberUsedPerkToday,
      getMemberPerkUsagesToday,
      loginWithPassword,
      updateMemberPassword,
    }),
    [
      members,
      membersQuery.isLoading,
      registerMember,
      findMemberByPhone,
      getMemberById,
      getActivePoints,
      addPoints,
      removePoints,
      updateMemberContact,
      updateMemberProfile,
      deleteMember,
      membershipRedemptions,
      redeemMembershipReward,
      unclaimMembershipReward,
      hasMemberRedeemedReward,
      hasMemberRedeemedAnyRewardToday,
      getMemberRedemptions,
      perkUsages,
      markPerkUsed,
      unmarkPerkUsed,
      hasMemberUsedPerkToday,
      getMemberPerkUsagesToday,
      loginWithPassword,
      updateMemberPassword,
    ],
  );
});
