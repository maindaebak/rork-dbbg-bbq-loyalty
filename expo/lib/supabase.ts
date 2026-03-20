import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

let supabase: SupabaseClient;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
} else {
  console.warn("[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Supabase client not initialized.");
  supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (prop === "auth") {
        return new Proxy({}, {
          get() {
            return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
          },
        });
      }
      if (prop === "from") {
        return () => new Proxy({}, {
          get() {
            return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
          },
        });
      }
      return () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
    },
  });
}

export { supabase };
