import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "member-auth-session";

export interface MemberProfile {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  birthdate: string;
  birthYear: string;
  createdAt: string;
  emailVerified: boolean;
}

interface AuthState {
  isLoggedIn: boolean;
  member: MemberProfile | null;
}

const EMPTY_AUTH: AuthState = { isLoggedIn: false, member: null };

async function loadSession(): Promise<AuthState> {
  const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    console.log("[Auth] No stored session found");
    return EMPTY_AUTH;
  }
  try {
    const parsed = JSON.parse(raw) as AuthState;
    console.log("[Auth] Restored session for", parsed.member?.fullName);
    return parsed;
  } catch {
    console.log("[Auth] Failed to parse stored session");
    return EMPTY_AUTH;
  }
}

async function persistSession(state: AuthState): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  console.log("[Auth] Session persisted, loggedIn:", state.isLoggedIn);
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<AuthState>(EMPTY_AUTH);
  const [isReady, setIsReady] = useState<boolean>(false);

  const sessionQuery = useQuery({
    queryKey: ["member-auth-session"],
    queryFn: loadSession,
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setAuth(sessionQuery.data);
      setIsReady(true);
    }
  }, [sessionQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async (member: MemberProfile) => {
      const next: AuthState = { isLoggedIn: true, member };
      await persistSession(next);
      return next;
    },
    onSuccess: (next) => {
      setAuth(next);
      queryClient.setQueryData(["member-auth-session"], next);
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async () => {
      if (!auth.member) throw new Error("Not logged in");
      const updated: MemberProfile = { ...auth.member, emailVerified: true };
      const next: AuthState = { isLoggedIn: true, member: updated };
      await persistSession(next);
      return next;
    },
    onSuccess: (next) => {
      setAuth(next);
      queryClient.setQueryData(["member-auth-session"], next);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Pick<MemberProfile, "email" | "phone">>) => {
      if (!auth.member) throw new Error("Not logged in");
      const updated: MemberProfile = { ...auth.member, ...updates };
      const next: AuthState = { isLoggedIn: true, member: updated };
      await persistSession(next);
      return next;
    },
    onSuccess: (next) => {
      setAuth(next);
      queryClient.setQueryData(["member-auth-session"], next);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log("[Auth] Session cleared");
    },
    onSuccess: () => {
      setAuth(EMPTY_AUTH);
      queryClient.setQueryData(["member-auth-session"], EMPTY_AUTH);
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      console.log("[Auth] Account deleted");
    },
    onSuccess: () => {
      setAuth(EMPTY_AUTH);
      queryClient.setQueryData(["member-auth-session"], EMPTY_AUTH);
    },
  });

  const login = useCallback(
    (member: MemberProfile) => loginMutation.mutate(member),
    [loginMutation],
  );

  const updateProfile = useCallback(
    (updates: Partial<Pick<MemberProfile, "email" | "phone">>) =>
      updateProfileMutation.mutate(updates),
    [updateProfileMutation],
  );

  const verifyEmail = useCallback(() => verifyEmailMutation.mutate(), [verifyEmailMutation]);
  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);
  const deleteAccount = useCallback(() => deleteAccountMutation.mutate(), [deleteAccountMutation]);

  return useMemo(
    () => ({
      isReady,
      isLoggedIn: auth.isLoggedIn,
      member: auth.member,
      login,
      verifyEmail,
      updateProfile,
      logout,
      deleteAccount,
      isLoggingIn: loginMutation.isPending,
      isVerifyingEmail: verifyEmailMutation.isPending,
      isUpdatingProfile: updateProfileMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      isDeletingAccount: deleteAccountMutation.isPending,
    }),
    [
      auth.isLoggedIn,
      auth.member,
      deleteAccount,
      deleteAccountMutation.isPending,
      isReady,
      login,
      loginMutation.isPending,
      logout,
      logoutMutation.isPending,
      verifyEmail,
      verifyEmailMutation.isPending,
      updateProfile,
      updateProfileMutation.isPending,
    ],
  );
});
