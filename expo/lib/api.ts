import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface SendSmsResponse {
  success: boolean;
  status?: string;
  error?: string;
}

interface VerifySmsResponse {
  success: boolean;
  status?: string;
  error?: string;
}

interface AdminLoginResponse {
  success: boolean;
  email?: string;
  error?: string;
}

export async function sendSmsCode(phone: string): Promise<SendSmsResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot send SMS");
      return { success: false, error: "SMS service is not configured. Please contact support." };
    }

    console.log("[API] Sending OTP to:", phone);
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      console.error("[API] Supabase OTP error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] OTP sent successfully");
    return { success: true, status: "pending" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] sendSmsCode exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

export async function signUpAndSendCode(
  phone: string,
  password: string,
): Promise<SendSmsResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot sign up");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    console.log("[API] Creating account with phone+password and sending OTP to:", phone);
    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
    });

    if (error) {
      console.error("[API] Supabase signUp error:", error.message);
      if (error.message.toLowerCase().includes("already registered") || error.message.toLowerCase().includes("already exists")) {
        console.log("[API] User already exists, sending OTP for existing user");
        const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
        if (otpError) {
          console.error("[API] Fallback OTP error:", otpError.message);
          return { success: false, error: otpError.message };
        }
        return { success: true, status: "pending" };
      }
      return { success: false, error: error.message };
    }

    console.log("[API] Account created, OTP sent. User:", data.user?.id);
    return { success: true, status: "pending" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] signUpAndSendCode exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

export async function verifySmsCode(phone: string, code: string): Promise<VerifySmsResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot verify SMS");
      return { success: false, error: "SMS service is not configured. Please contact support." };
    }

    console.log("[API] Verifying OTP for:", phone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });

    if (error) {
      console.error("[API] Supabase verify error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] OTP verified successfully, user:", data.user?.id);
    return { success: true, status: "approved" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] verifySmsCode exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

interface MemberSignupResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

interface MemberLoginResponse {
  success: boolean;
  userId?: string;
  error?: string;
}

export async function memberSignupWithPassword(
  phone: string,
  password: string,
): Promise<MemberSignupResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot sign up member");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    console.log("[API] Ensuring password is set for member with phone:", phone);

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      console.log("[API] Active session found for user:", sessionData.session.user.id);
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error("[API] Supabase updateUser password error:", error.message);
        return { success: false, error: error.message };
      }

      console.log("[API] Password confirmed for user:", data.user?.id);
      return { success: true, userId: data.user?.id ?? sessionData.session.user.id };
    }

    console.log("[API] No active session - account was already created via signUp");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] memberSignupWithPassword exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

export async function memberLoginWithPassword(
  phone: string,
  password: string,
): Promise<MemberLoginResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot login member");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    console.log("[API] Logging in member with phone:", phone);
    const { data, error } = await supabase.auth.signInWithPassword({
      phone,
      password,
    });

    if (error) {
      console.error("[API] Supabase member login error:", error.message);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error("[API] Supabase login returned no user");
      return { success: false, error: "Login failed. Please try again." };
    }

    console.log("[API] Member logged in via Supabase, user:", data.user.id);
    return { success: true, userId: data.user.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] memberLoginWithPassword exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  try {
    console.log("[API] Admin login attempt for:", email);

    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot login admin");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error("[API] Supabase admin login error:", error.message);
      return { success: false, error: error.message };
    }

    if (!data.user) {
      console.error("[API] Supabase login returned no user");
      return { success: false, error: "Login failed. Please try again." };
    }

    console.log("[API] Admin logged in via Supabase, user:", data.user.id);
    return { success: true, email: data.user.email ?? email.trim() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] adminLogin exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}
