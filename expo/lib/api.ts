import { supabase, isSupabaseConfigured, getVerificationClient } from "@/lib/supabase";

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
      console.error("[API] Supabase is not configured - cannot send verification SMS");
      return { success: false, error: "SMS service is not configured. Please contact support." };
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Sending Supabase verification OTP to:", formattedPhone);

    const verifyClient = getVerificationClient();
    const { error } = await verifyClient.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error("[API] Supabase verification OTP error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] Supabase verification OTP sent successfully");
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

export async function signUpWithPhone(phone: string): Promise<SendSmsResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot sign up");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Signing up with Supabase phone OTP for:", formattedPhone);
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error("[API] Supabase signInWithOtp error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] Supabase OTP sent successfully for signup", data);
    return { success: true, status: "pending" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] signUpWithPhone exception:", msg);
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

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Verifying Supabase OTP code for:", formattedPhone);

    const verifyClient = getVerificationClient();
    const { error } = await verifyClient.auth.verifyOtp({
      phone: formattedPhone,
      token: code,
      type: "sms",
    });

    if (error) {
      console.error("[API] Supabase verification OTP verify error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] Supabase verification OTP verified successfully");

    if (verifyClient.auth.signOut) {
      await verifyClient.auth.signOut();
      console.log("[API] Signed out verification client session");
    }

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

export async function loginWithPhone(phone: string): Promise<SendSmsResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot login member");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Sending Supabase phone OTP for login:", formattedPhone);
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      console.error("[API] Supabase signInWithOtp login error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] Supabase OTP sent successfully for login", data);
    return { success: true, status: "pending" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] loginWithPhone exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

export async function verifyPhoneOtp(phone: string, code: string): Promise<VerifySmsResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot verify OTP");
      return { success: false, error: "Authentication service is not configured. Please contact support." };
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Verifying Supabase phone OTP for:", formattedPhone);
    const { data, error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: code,
      type: "sms",
    });

    if (error) {
      console.error("[API] Supabase verifyOtp error:", error.message);
      return { success: false, error: error.message };
    }

    if (!data.session) {
      console.error("[API] Supabase verifyOtp returned no session");
      return { success: false, error: "Verification failed. Please try again." };
    }

    console.log("[API] Supabase OTP verified, user:", data.user?.id);
    return { success: true, status: "approved" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] verifyPhoneOtp exception:", msg);
    if (msg.toLowerCase().includes("load failed") || msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
      return { success: false, error: "Network error. Please check your internet connection and try again." };
    }
    return { success: false, error: msg };
  }
}

interface MarketingRecipient {
  phone: string;
  name: string;
}

interface SendMarketingResponse {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  results?: { phone: string; success: boolean; error?: string }[];
  error?: string;
}

export async function sendMarketingSms(
  recipients: MarketingRecipient[],
  message: string,
): Promise<SendMarketingResponse> {
  try {
    if (!isSupabaseConfigured()) {
      console.error("[API] Supabase is not configured - cannot send marketing SMS");
      return { success: false, sent: 0, failed: recipients.length, total: recipients.length, error: "SMS service is not configured." };
    }

    console.log(`[API] Sending marketing SMS via edge function to ${recipients.length} recipients`);
    console.log(`[API] Message length: ${message.length}`);

    const { data, error } = await supabase.functions.invoke("send-marketing-sms", {
      body: { recipients, message },
    });

    if (error) {
      console.error("[API] Edge function error:", error.message);
      return { success: false, sent: 0, failed: recipients.length, total: recipients.length, error: error.message };
    }

    console.log("[API] Edge function response:", data);
    return data as SendMarketingResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] sendMarketingSms exception:", msg);
    return { success: false, sent: 0, failed: recipients.length, total: recipients.length, error: msg };
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
