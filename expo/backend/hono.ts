import { Hono } from "hono";
import { cors } from "hono/cors";

console.log("[Backend] Starting Dae Bak Bon Ga API server v7...");

const app = new Hono();

app.use("*", cors());

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function formatE164(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");

  if (!cleaned.startsWith("+")) {
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length === 10) {
      cleaned = `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      cleaned = `+${digits}`;
    } else if (digits.length >= 7) {
      cleaned = `+${digits}`;
    } else {
      throw new Error("Invalid phone number. Please enter your full number with country code (e.g. +12025551234).");
    }
  }

  if (!E164_REGEX.test(cleaned)) {
    throw new Error(`Invalid phone number format: "${cleaned}". Must be E.164 format like +12025551234.`);
  }

  return cleaned;
}

function getTwilioCredentials() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").replace(/[^\x20-\x7E]/g, "").trim();

  if (!accountSid || !authToken || !serviceSid) {
    const missing: string[] = [];
    if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
    if (!serviceSid) missing.push("TWILIO_VERIFY_SERVICE_SID");
    throw new Error(`Server config error: Missing ${missing.join(", ")}. Please contact support.`);
  }

  if (!accountSid.startsWith("AC")) {
    throw new Error("Invalid TWILIO_ACCOUNT_SID: must start with 'AC'");
  }
  if (!serviceSid.startsWith("VA")) {
    throw new Error("Invalid TWILIO_VERIFY_SERVICE_SID: must start with 'VA'");
  }

  return { accountSid, authToken, serviceSid };
}

async function callTwilioVerifyAPI(path: string, body: Record<string, string>) {
  const { accountSid, authToken, serviceSid } = getTwilioCredentials();

  const url = `https://verify.twilio.com/v2/Services/${serviceSid}${path}`;
  const credentials = `${accountSid}:${authToken}`;
  const base64Auth = typeof Buffer !== "undefined"
    ? Buffer.from(credentials).toString("base64")
    : btoa(credentials);

  const formBody = Object.entries(body)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  console.log("[Twilio] POST", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${base64Auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });

  const text = await response.text();
  console.log("[Twilio] Response status:", response.status);

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Twilio returned invalid response (HTTP ${response.status}): ${text.substring(0, 200)}`);
  }

  if (!response.ok) {
    const twilioMsg = typeof json.message === "string" ? json.message : "Unknown error";
    throw new Error(`Twilio error: ${twilioMsg}`);
  }

  return json;
}

async function handleSendSms(c: any) {
  try {
    const body = await c.req.json();
    const phone = typeof body.phone === "string" ? body.phone : "";
    console.log("[API] send-sms called with phone:", JSON.stringify(phone));

    if (phone.replace(/[^\d]/g, "").length < 8) {
      return c.json({ success: false, error: "Phone number is too short." }, 400);
    }

    const e164 = formatE164(phone);
    const result = await callTwilioVerifyAPI("/Verifications", { To: e164, Channel: "sms" });
    console.log("[API] SMS sent, status:", result.status);
    return c.json({ success: true, status: result.status as string });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API] send-sms FAILED:", msg);
    return c.json({ success: false, error: msg }, 500);
  }
}

async function handleVerifySms(c: any) {
  try {
    const body = await c.req.json();
    const phone = typeof body.phone === "string" ? body.phone : "";
    const code = typeof body.code === "string" ? body.code : "";
    console.log("[API] verify-sms called with phone:", JSON.stringify(phone));

    if (phone.replace(/[^\d]/g, "").length < 8) {
      return c.json({ success: false, error: "Phone number is too short." }, 400);
    }
    if (code.length !== 6) {
      return c.json({ success: false, error: "Code must be 6 digits." }, 400);
    }

    const e164 = formatE164(phone);
    const result = await callTwilioVerifyAPI("/VerificationCheck", { To: e164, Code: code });
    const approved = result.status === "approved";
    console.log("[API] Verification:", approved ? "APPROVED" : "DENIED");
    return c.json({ success: approved, status: result.status as string });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API] verify-sms FAILED:", msg);
    return c.json({ success: false, error: msg }, 500);
  }
}

async function handleAdminLogin(c: any) {
  try {
    const body = await c.req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    console.log("[API] admin-login called for:", email);

    const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD ?? "").trim();

    if (!adminEmail || !adminPassword) {
      return c.json({ success: false, error: "Admin credentials not configured on server" }, 500);
    }

    if (email !== adminEmail || password !== adminPassword) {
      return c.json({ success: false, error: "Invalid admin credentials" }, 401);
    }

    console.log("[API] Admin login successful for", email);
    return c.json({ success: true, email });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ success: false, error: msg }, 500);
  }
}

function handleHealth(c: any) {
  return c.json({ status: "ok", v: 7, message: "Dae Bak Bon Ga API is running", time: new Date().toISOString() });
}

function handleTwilioCheck(c: any) {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  return c.json({
    accountSidPresent: accountSid.length > 0,
    accountSidStartsWithAC: accountSid.startsWith("AC"),
    authTokenPresent: authToken.length > 0,
    serviceSidPresent: serviceSid.length > 0,
    serviceSidStartsWithVA: serviceSid.startsWith("VA"),
  });
}

app.get("/", handleHealth);
app.get("/api", handleHealth);

app.post("/send-sms", handleSendSms);
app.post("/api/send-sms", handleSendSms);

app.post("/verify-sms", handleVerifySms);
app.post("/api/verify-sms", handleVerifySms);

app.get("/twilio-check", handleTwilioCheck);
app.get("/api/twilio-check", handleTwilioCheck);

app.post("/admin-login", handleAdminLogin);
app.post("/api/admin-login", handleAdminLogin);

console.log("[Backend] Server v7 ready");

export default app;
