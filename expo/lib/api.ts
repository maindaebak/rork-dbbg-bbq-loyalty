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

function getApiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "").trim();
  console.log("[API] EXPO_PUBLIC_RORK_API_BASE_URL:", JSON.stringify(raw));

  if (!raw) {
    console.warn("[API] No base URL configured, using relative path");
    return "/api";
  }

  const base = raw.endsWith("/") ? raw.slice(0, -1) : raw;
  const full = `${base}/api`;
  console.log("[API] Base URL:", full);
  return full;
}

async function apiPost<T>(path: string, body: Record<string, string>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  console.log("[API] POST", url, "body:", JSON.stringify(body));

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  console.log("[API] Response status:", response.status);

  const text = await response.text();
  console.log("[API] Response body:", text.substring(0, 500));

  let json: T;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Server returned invalid response (HTTP ${response.status})`);
  }

  return json;
}

export async function sendSmsCode(phone: string): Promise<SendSmsResponse> {
  return apiPost<SendSmsResponse>("/send-sms", { phone });
}

export async function verifySmsCode(phone: string, code: string): Promise<VerifySmsResponse> {
  return apiPost<VerifySmsResponse>("/verify-sms", { phone, code });
}
