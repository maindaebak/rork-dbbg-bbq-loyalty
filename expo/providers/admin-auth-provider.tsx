import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import { trpcClient } from "@/lib/trpc";

const ADMIN_AUTH_KEY = "dbbg-admin-session";

interface AdminAuthState {
  isLoggedIn: boolean;
  email: string | null;
}

const EMPTY_ADMIN: AdminAuthState = { isLoggedIn: false, email: null };

async function loadAdminSession(): Promise<AdminAuthState> {
  const raw = await AsyncStorage.getItem(ADMIN_AUTH_KEY);
  if (!raw) {
    console.log("[AdminAuth] No stored admin session");
    return EMPTY_ADMIN;
  }
  try {
    const parsed = JSON.parse(raw) as AdminAuthState;
    console.log("[AdminAuth] Restored admin session for", parsed.email);
    return parsed;
  } catch {
    console.log("[AdminAuth] Failed to parse admin session");
    return EMPTY_ADMIN;
  }
}

export const [AdminAuthProvider, useAdminAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [auth, setAuth] = useState<AdminAuthState>(EMPTY_ADMIN);
  const [isReady, setIsReady] = useState<boolean>(false);

  const sessionQuery = useQuery({
    queryKey: ["admin-auth-session"],
    queryFn: loadAdminSession,
  });

  useEffect(() => {
    if (sessionQuery.data) {
      setAuth(sessionQuery.data);
      setIsReady(true);
    }
  }, [sessionQuery.data]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await trpcClient.admin.login.mutate({ email, password });

      if (!result.success) {
        throw new Error("Invalid admin credentials");
      }

      const next: AdminAuthState = { isLoggedIn: true, email: result.email };
      await AsyncStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(next));
      console.log("[AdminAuth] Admin logged in via server");
      return next;
    },
    onSuccess: (next) => {
      setAuth(next);
      queryClient.setQueryData(["admin-auth-session"], next);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await AsyncStorage.removeItem(ADMIN_AUTH_KEY);
      console.log("[AdminAuth] Admin session cleared");
    },
    onSuccess: () => {
      setAuth(EMPTY_ADMIN);
      queryClient.setQueryData(["admin-auth-session"], EMPTY_ADMIN);
    },
  });

  const login = useCallback(
    (email: string, password: string) => loginMutation.mutateAsync({ email, password }),
    [loginMutation],
  );

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return useMemo(
    () => ({
      isReady,
      isAdminLoggedIn: auth.isLoggedIn,
      adminEmail: auth.email,
      login,
      logout,
      isLoggingIn: loginMutation.isPending,
      loginError: loginMutation.error instanceof Error ? loginMutation.error.message : null,
      isLoggingOut: logoutMutation.isPending,
    }),
    [
      auth.email,
      auth.isLoggedIn,
      isReady,
      login,
      loginMutation.error,
      loginMutation.isPending,
      logout,
      logoutMutation.isPending,
    ],
  );
});
