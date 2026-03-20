import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;
let _isConfigured = false;

function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

function getSupabaseKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function isSupabaseConfigured(): boolean {
  return _isConfigured;
}

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;

  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseKey();

  console.log("[Supabase] Initializing client...");
  console.log("[Supabase] URL:", supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "EMPTY");
  console.log("[Supabase] Key:", supabaseAnonKey ? supabaseAnonKey.substring(0, 10) + "..." : "EMPTY");

  _isConfigured = Boolean(supabaseUrl && supabaseAnonKey);

  if (!_isConfigured) {
    console.warn("[Supabase] Missing URL or Key - Supabase features will not work");
  }

  const url = supabaseUrl || "https://placeholder.supabase.co";
  const key = supabaseAnonKey || "placeholder-key";

  _supabase = createClient(url, key, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});
