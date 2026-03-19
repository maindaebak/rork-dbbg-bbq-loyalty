import { Hono } from "hono";
import { cors } from "hono/cors";

console.log("[Backend] Starting Dae Bak Bon Ga API server...");

const app = new Hono();

app.use("*", cors());

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

function formatE164(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, "");
  console.log("[formatE164] Input:", JSON.stringify(phone), "Cleaned:", JSON.stringify(cleaned));

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

  console.log("[formatE164] Result:", cleaned);
  return cleaned;
}

function getTwilioCredentials() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").replace(/[^\x20-\x7E]/g, "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").replace(/[^\x20-\x7E]/g, "").trim();

  console.log("[Twilio] accountSid:", JSON.stringify(accountSid), "len:", accountSid.length);
  console.log("[Twilio] authToken present:", authToken.length > 0, "len:", authToken.length);
  console.log("[Twilio] serviceSid:", JSON.stringify(serviceSid), "len:", serviceSid.length);

  if (!accountSid || !authToken || !serviceSid) {
    const missing: string[] = [];
    if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
    if (!serviceSid) missing.push("TWILIO_VERIFY_SERVICE_SID");
    throw new Error(`Server config error: Missing ${missing.join(", ")}. Please contact support.`);
  }

  if (!accountSid.startsWith("AC")) {
    throw new Error(`Invalid TWILIO_ACCOUNT_SID: must start with 'AC'`);
  }
  if (!serviceSid.startsWith("VA")) {
    throw new Error(`Invalid TWILIO_VERIFY_SERVICE_SID: must start with 'VA'`);
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
  console.log("[Twilio] Body:", JSON.stringify(body));

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
  console.log("[Twilio] Response body:", text.substring(0, 1000));

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Twilio returned invalid response (HTTP ${response.status}): ${text.substring(0, 200)}`);
  }

  if (!response.ok) {
    const twilioCode = typeof json.code === "string" || typeof json.code === "number" ? String(json.code) : "unknown";
    const twilioMsg = typeof json.message === "string" ? json.message : typeof json.error_message === "string" ? json.error_message : "Unknown error";
    console.error("[Twilio] ERROR - code:", twilioCode, "message:", twilioMsg);
    throw new Error(`Twilio error (${twilioCode}): ${twilioMsg}`);
  }

  return json;
}

const healthCheck = (c: any) =>
  c.json({
    status: "ok",
    message: "Dae Bak Bon Ga API is running",
    time: new Date().toISOString(),
  });

app.get("/", healthCheck);
app.get("/api", healthCheck);
app.get("/api/", healthCheck);

app.post("/api/send-sms", async (c) => {
  try {
    const body = await c.req.json();
    const phone = typeof body.phone === "string" ? body.phone : "";
    console.log("[API] /api/send-sms called with phone:", JSON.stringify(phone));

    if (phone.replace(/[^\d]/g, "").length < 8) {
      return c.json({ success: false, error: "Phone number is too short." }, 400);
    }

    const e164 = formatE164(phone);
    console.log("[API] Formatted E.164:", e164);

    const result = await callTwilioVerifyAPI("/Verifications", {
      To: e164,
      Channel: "sms",
    });

    console.log("[API] SMS sent successfully, status:", result.status);
    return c.json({ success: true, status: result.status as string });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API] /api/send-sms FAILED:", msg);
    return c.json({ success: false, error: msg }, 500);
  }
});

app.post("/api/verify-sms", async (c) => {
  try {
    const body = await c.req.json();
    const phone = typeof body.phone === "string" ? body.phone : "";
    const code = typeof body.code === "string" ? body.code : "";
    console.log("[API] /api/verify-sms called with phone:", JSON.stringify(phone));

    if (phone.replace(/[^\d]/g, "").length < 8) {
      return c.json({ success: false, error: "Phone number is too short." }, 400);
    }
    if (code.length !== 6) {
      return c.json({ success: false, error: "Code must be 6 digits." }, 400);
    }

    const e164 = formatE164(phone);
    const result = await callTwilioVerifyAPI("/VerificationCheck", {
      To: e164,
      Code: code,
    });

    const approved = result.status === "approved";
    console.log("[API] Verification result:", approved ? "APPROVED" : "DENIED");
    return c.json({ success: approved, status: result.status as string });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[API] /api/verify-sms FAILED:", msg);
    return c.json({ success: false, error: msg }, 500);
  }
});

const twilioCheck = (c: any) => {
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
};

app.get("/twilio-check", twilioCheck);
app.get("/api/twilio-check", twilioCheck);

console.log("[Backend] Server ready");

export default app;
