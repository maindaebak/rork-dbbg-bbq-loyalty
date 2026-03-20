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

  const notConfiguredError = new Error("Supabase not configured");

  const createChainableProxy = (): any => {
    const proxy: any = new Proxy(
      Object.assign(() => {}, {
        then: (resolve: (value: any) => void) => {
          resolve({ data: null, error: notConfiguredError });
          return proxy;
        },
      }),
      {
        get(target, prop) {
          if (prop === "then") return target.then;
          if (prop === "data") return null;
          if (prop === "error") return notConfiguredError;
          return (..._args: any[]) => createChainableProxy();
        },
        apply() {
          return createChainableProxy();
        },
      }
    );
    return proxy;
  };

  supabase = new Proxy({} as SupabaseClient, {
    get(_, prop) {
      if (prop === "auth") {
        return new Proxy({}, {
          get() {
            return (..._args: any[]) => Promise.resolve({ data: null, error: notConfiguredError });
          },
        });
      }
      if (prop === "from") {
        return (..._args: any[]) => createChainableProxy();
      }
      return (..._args: any[]) => Promise.resolve({ data: null, error: notConfiguredError });
    },
  });
}

export { supabase };
