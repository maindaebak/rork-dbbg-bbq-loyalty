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

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";

function isTwilioConfigured(): boolean {
  const configured = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_VERIFY_SERVICE_SID);
  console.log("[Twilio] Configured:", configured, "SID:", TWILIO_ACCOUNT_SID ? TWILIO_ACCOUNT_SID.substring(0, 8) + "..." : "EMPTY", "Service:", TWILIO_VERIFY_SERVICE_SID ? TWILIO_VERIFY_SERVICE_SID.substring(0, 8) + "..." : "EMPTY");
  return configured;
}

function getTwilioAuthHeader(): string {
  const credentials = `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`;
  return "Basic " + btoa(credentials);
}

export async function sendSmsCode(phone: string): Promise<SendSmsResponse> {
  try {
    if (!isTwilioConfigured()) {
      console.error("[API] Twilio is not configured - cannot send SMS");
      return { success: false, error: "SMS service is not configured. Please contact support." };
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Sending Twilio Verify SMS to:", formattedPhone);

    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/Verifications`;
    const body = new URLSearchParams({
      To: formattedPhone,
      Channel: "sms",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": getTwilioAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();
    console.log("[API] Twilio Verify response status:", response.status, "sid:", data.sid ?? "none");

    if (!response.ok) {
      const errorMsg = data.message ?? "Failed to send verification code.";
      console.error("[API] Twilio Verify error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log("[API] Twilio Verify SMS sent successfully, status:", data.status);
    return { success: true, status: data.status ?? "pending" };
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

    console.log("[API] Creating account with phone+password for:", phone);
    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
    });

    if (error) {
      console.error("[API] Supabase signUp error:", error.message);
      if (!error.message.toLowerCase().includes("already registered") && !error.message.toLowerCase().includes("already exists")) {
        return { success: false, error: error.message };
      }
      console.log("[API] User already exists, continuing to send verification code");
    } else {
      console.log("[API] Account created. User:", data.user?.id);
    }

    console.log("[API] Now sending Twilio Verify SMS for signup...");
    const smsResult = await sendSmsCode(phone);
    return smsResult;
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
    if (!isTwilioConfigured()) {
      console.error("[API] Twilio is not configured - cannot verify SMS");
      return { success: false, error: "SMS service is not configured. Please contact support." };
    }

    const formattedPhone = phone.startsWith("+") ? phone : `+${phone}`;
    console.log("[API] Verifying Twilio code for:", formattedPhone);

    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`;
    const body = new URLSearchParams({
      To: formattedPhone,
      Code: code,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": getTwilioAuthHeader(),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = await response.json();
    console.log("[API] Twilio VerificationCheck response status:", response.status, "verification status:", data.status);

    if (!response.ok) {
      const errorMsg = data.message ?? "Verification failed.";
      console.error("[API] Twilio verify error:", errorMsg);
      return { success: false, error: errorMsg };
    }

    if (data.status === "approved") {
      console.log("[API] Twilio verification approved");
      return { success: true, status: "approved" };
    }

    console.log("[API] Twilio verification not approved, status:", data.status);
    return { success: false, error: "Invalid verification code. Please try again." };
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
