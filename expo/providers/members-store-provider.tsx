import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

const MEMBERS_STORAGE_KEY = "dbbg-members-store";

export interface StoredMember {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  birthdate: string;
  birthYear: string;
  createdAt: string;
  emailVerified: boolean;
  points: number;
  pointsHistory: PointsEntry[];
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

async function loadMembers(): Promise<StoredMember[]> {
  const raw = await AsyncStorage.getItem(MEMBERS_STORAGE_KEY);
  if (!raw) {
    console.log("[MembersStore] No stored members found");
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as StoredMember[];
    console.log("[MembersStore] Loaded", parsed.length, "members");
    return parsed;
  } catch {
    console.log("[MembersStore] Failed to parse members data");
    return [];
  }
}

async function saveMembers(members: StoredMember[]): Promise<StoredMember[]> {
  await AsyncStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  console.log("[MembersStore] Saved", members.length, "members");
  return members;
}

export const [MembersStoreProvider, useMembersStore] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<StoredMember[]>([]);

  const membersQuery = useQuery({
    queryKey: ["members-store"],
    queryFn: loadMembers,
  });

  useEffect(() => {
    if (membersQuery.data) {
      setMembers(membersQuery.data);
    }
  }, [membersQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveMembers,
    onSuccess: (saved) => {
      setMembers(saved);
      queryClient.setQueryData(["members-store"], saved);
    },
  });

  const registerMember = useCallback(
    (member: Omit<StoredMember, "points" | "pointsHistory">) => {
      const existing = members.find((m) => m.phone === member.phone);
      if (existing) {
        console.log("[MembersStore] Member already exists with phone", member.phone);
        return existing;
      }
      const newMember: StoredMember = {
        ...member,
        emailVerified: false,
        points: 0,
        pointsHistory: [],
      };
      const updated = [...members, newMember];
      saveMutation.mutate(updated);
      console.log("[MembersStore] Registered new member", member.fullName);
      return newMember;
    },
    [members, saveMutation],
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

  const addPoints = useCallback(
    (memberId: string, dollarAmount: number, pointsPerDollar: number, note: string) => {
      const pointsToAdd = Math.round(dollarAmount * pointsPerDollar);
      const addedAt = new Date();
      const expiresAt = new Date(addedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const entry: PointsEntry = {
        id: `pts-${Date.now()}`,
        type: "earned",
        amount: pointsToAdd,
        dollarAmount,
        addedBy: "admin",
        addedAt: addedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        note,
      };
      const updated = members.map((m) => {
        if (m.id === memberId) {
          const newHistory = [entry, ...m.pointsHistory];
          return {
            ...m,
            points: m.points + pointsToAdd,
            pointsHistory: newHistory,
          };
        }
        return m;
      });
      saveMutation.mutate(updated);
      console.log("[MembersStore] Added", pointsToAdd, "points to member", memberId);
      return pointsToAdd;
    },
    [members, saveMutation],
  );

  const removePoints = useCallback(
    (memberId: string, pointsAmount: number, note: string) => {
      const addedAt = new Date();
      const entry: PointsEntry = {
        id: `pts-${Date.now()}`,
        type: "redeemed",
        amount: pointsAmount,
        dollarAmount: 0,
        addedBy: "admin",
        addedAt: addedAt.toISOString(),
        expiresAt: "",
        note,
      };
      const updated = members.map((m) => {
        if (m.id === memberId) {
          const newHistory = [entry, ...m.pointsHistory];
          return {
            ...m,
            points: Math.max(0, m.points - pointsAmount),
            pointsHistory: newHistory,
          };
        }
        return m;
      });
      saveMutation.mutate(updated);
      console.log("[MembersStore] Removed", pointsAmount, "points from member", memberId);
      return pointsAmount;
    },
    [members, saveMutation],
  );

  const updateMemberContact = useCallback(
    (memberId: string, updates: Partial<Pick<StoredMember, "email" | "phone">>) => {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, ...updates };
        }
        return m;
      });
      saveMutation.mutate(updated);
    },
    [members, saveMutation],
  );

  const updateMemberProfile = useCallback(
    (memberId: string, updates: Partial<Pick<StoredMember, "fullName" | "email" | "phone" | "birthdate" | "birthYear">>) => {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, ...updates };
        }
        return m;
      });
      saveMutation.mutate(updated);
      console.log("[MembersStore] Updated profile for member", memberId, updates);
    },
    [members, saveMutation],
  );

  const setEmailVerified = useCallback(
    (memberId: string, verified: boolean) => {
      const updated = members.map((m) => {
        if (m.id === memberId) {
          return { ...m, emailVerified: verified };
        }
        return m;
      });
      saveMutation.mutate(updated);
      console.log("[MembersStore] Set emailVerified =", verified, "for member", memberId);
    },
    [members, saveMutation],
  );

  const deleteMember = useCallback(
    (memberId: string) => {
      const updated = members.filter((m) => m.id !== memberId);
      saveMutation.mutate(updated);
      console.log("[MembersStore] Deleted member", memberId);
    },
    [members, saveMutation],
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
      setEmailVerified,
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
      setEmailVerified,
      deleteMember,
    ],
  );
});
