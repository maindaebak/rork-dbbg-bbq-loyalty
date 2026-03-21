import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { LoyaltyTier } from "@/constants/loyalty-program";
import { supabase } from "@/lib/supabase";

const MEMBERS_STORAGE_KEY = "dbbg-members-store";

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

export const [MembersStoreProvider, useMembersStore] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<StoredMember[]>([]);

  const membersQuery = useQuery({
    queryKey: ["members-store"],
    queryFn: fetchMembersFromSupabase,
  });

  useEffect(() => {
    if (membersQuery.data) {
      setMembers(membersQuery.data);
    }
  }, [membersQuery.data]);

  const registerMemberMutation = useMutation({
    mutationFn: async (member: Omit<StoredMember, "points" | "pointsHistory">) => {
      console.log("[MembersStore] Registering member in Supabase:", member.fullName);

      const { data: existing } = await supabase
        .from("members")
        .select("*")
        .eq("phone", member.phone)
        .maybeSingle();

      if (existing) {
        console.log("[MembersStore] Member already exists with phone", member.phone);
        return dbMemberToStored(existing as DbMember, []);
      }

      const { data: authUser } = await supabase.auth.getUser();

      const { data: inserted, error } = await supabase
        .from("members")
        .insert({
          full_name: member.fullName,
          phone: member.phone,
          birthdate: member.birthdate || null,
          birth_year: member.birthYear || null,
          auth_id: authUser?.user?.id ?? null,
          marketing_opt_in: member.marketingOptIn ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error("[MembersStore] Insert error:", error.message);
        throw new Error(error.message);
      }

      console.log("[MembersStore] Registered member:", inserted.id);
      return dbMemberToStored(inserted as DbMember, []);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members-store"] });
    },
  });

  const registerMember = useCallback(
    (member: Omit<StoredMember, "points" | "pointsHistory">) => {
      const existing = members.find(
        (m) => m.phone.replace(/\D/g, "") === member.phone.replace(/\D/g, "")
      );
      if (existing) {
        console.log("[MembersStore] Member already exists locally");
        return existing;
      }
      registerMemberMutation.mutate(member);
      const optimistic: StoredMember = { ...member, points: 0, pointsHistory: [], marketingOptIn: member.marketingOptIn ?? false };
      setMembers((prev) => [...prev, optimistic]);
      return optimistic;
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
      updates: Partial<Pick<StoredMember, "fullName" | "phone" | "birthdate" | "birthYear" | "marketingOptIn">>;
    }) => {
      const dbUpdates: Record<string, string | boolean | null> = {};
      if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.birthdate !== undefined) dbUpdates.birthdate = updates.birthdate || null;
      if (updates.birthYear !== undefined) dbUpdates.birth_year = updates.birthYear || null;
      if (updates.marketingOptIn !== undefined) dbUpdates.marketing_opt_in = updates.marketingOptIn;

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
    (memberId: string, updates: Partial<Pick<StoredMember, "fullName" | "phone" | "birthdate" | "birthYear" | "marketingOptIn">>) => {
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
    ],
  );
});
