import { supabase } from "@/lib/supabase";

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
    return { success: false, error: msg };
  }
}

export async function verifySmsCode(phone: string, code: string): Promise<VerifySmsResponse> {
  try {
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
    return { success: false, error: msg };
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  try {
    console.log("[API] Admin login for:", email);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("[API] Admin login error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("[API] Admin logged in:", data.user?.email);
    return { success: true, email: data.user?.email ?? email };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] adminLogin exception:", msg);
    return { success: false, error: msg };
  }
}
