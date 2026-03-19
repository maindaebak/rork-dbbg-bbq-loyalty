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

function getBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "").trim();
  if (!raw) {
    return "";
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

async function tryPost<T>(url: string, body: Record<string, string>): Promise<{ ok: boolean; data?: T; status: number }> {
  try {
    console.log("[API] POST", url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log("[API] Response status:", response.status);

    if (response.status === 404 || response.status === 405) {
      return { ok: false, status: response.status };
    }

    const text = await response.text();
    console.log("[API] Response body:", text.substring(0, 500));

    let json: T;
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[API] Failed to parse JSON from:", text.substring(0, 200));
      return { ok: false, status: response.status };
    }

    return { ok: true, data: json, status: response.status };
  } catch (error) {
    console.error("[API] Fetch error for", url, ":", error);
    return { ok: false, status: 0 };
  }
}

async function apiPost<T>(path: string, body: Record<string, string>): Promise<T> {
  const base = getBaseUrl();

  const urls = [
    `${base}/api${path}`,
    `${base}${path}`,
  ];

  console.log("[API] Trying endpoints for", path, ":", urls);

  let lastError = "";

  for (const url of urls) {
    const result = await tryPost<T>(url, body);
    if (result.ok && result.data) {
      console.log("[API] Success from:", url);
      return result.data;
    }
    if (result.status !== 404 && result.status !== 405 && result.status !== 0) {
      console.log("[API] Got non-404 response from:", url, "status:", result.status);
      if (result.data) return result.data;
    }
    lastError = `HTTP ${result.status} from ${url}`;
    console.log("[API] Endpoint failed:", lastError, "- trying next...");
  }

  throw new Error(`Unable to reach the server. ${lastError}`);
}

export async function sendSmsCode(phone: string): Promise<SendSmsResponse> {
  return apiPost<SendSmsResponse>("/send-sms", { phone });
}

export async function verifySmsCode(phone: string, code: string): Promise<VerifySmsResponse> {
  return apiPost<VerifySmsResponse>("/verify-sms", { phone, code });
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  return apiPost<AdminLoginResponse>("/admin-login", { email, password });
}
