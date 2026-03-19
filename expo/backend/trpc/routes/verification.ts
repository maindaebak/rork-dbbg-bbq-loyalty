import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  throw new Error(`Invalid phone number format. Expected 10 digits, got ${digits.length}.`);
}

async function callTwilioVerifyAPI(path: string, body: Record<string, string>) {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  console.log("[Twilio] accountSid length:", accountSid.length, "prefix:", accountSid.substring(0, 4));
  console.log("[Twilio] authToken length:", authToken.length);
  console.log("[Twilio] serviceSid length:", serviceSid.length, "prefix:", serviceSid.substring(0, 4));

  if (!accountSid || !authToken || !serviceSid) {
    const missing = [];
    if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
    if (!serviceSid) missing.push("TWILIO_VERIFY_SERVICE_SID");
    throw new Error(`Missing Twilio config: ${missing.join(", ")}`);
  }

  const url = `https://verify.twilio.com/v2/Services/${serviceSid}${path}`;
  const credentials = `${accountSid}:${authToken}`;
  let base64: string;
  try {
    if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(credentials).toString("base64");
    } else {
      base64 = btoa(credentials);
    }
  } catch (e) {
    console.error("[Twilio] Base64 encoding failed:", e);
    base64 = btoa(unescape(encodeURIComponent(credentials)));
  }
  const authHeader = `Basic ${base64}`;

  const formParts: string[] = [];
  for (const [key, value] of Object.entries(body)) {
    formParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  const formBody = formParts.join("&");

  console.log("[Twilio] POST", url);
  console.log("[Twilio] form body:", formBody);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });

  const text = await response.text();
  console.log("[Twilio] status:", response.status, "body:", text.substring(0, 500));

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Twilio returned invalid JSON (HTTP ${response.status}): ${text.substring(0, 200)}`);
  }

  if (!response.ok) {
    const msg = (json.message ?? json.error_message ?? `Twilio error (HTTP ${response.status})`) as string;
    console.error("[Twilio] API error:", msg, "code:", json.code);
    throw new Error(msg);
  }

  return json;
}

export const verificationRouter = createTRPCRouter({
  sendSmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const e164 = formatE164(input.phone);
      console.log("[Verification] Sending SMS to:", e164);

      const result = await callTwilioVerifyAPI("/Verifications", {
        To: e164,
        Channel: "sms",
      });

      console.log("[Verification] Send result status:", result.status);
      return { success: true, status: result.status as string };
    }),

  verifySmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(10), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      const e164 = formatE164(input.phone);
      console.log("[Verification] Checking code for:", e164);

      const result = await callTwilioVerifyAPI("/VerificationCheck", {
        To: e164,
        Code: input.code,
      });

      const approved = result.status === "approved";
      console.log("[Verification] Check result:", approved ? "APPROVED" : "DENIED");
      return { success: approved, status: result.status as string };
    }),
});
