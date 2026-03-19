import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

function stripNonPrintable(str: string): string {
  return str.replace(/[^\x20-\x7E]/g, "").trim();
}

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
      throw new Error(`Invalid phone number. Please enter your full number with country code (e.g. +12025551234).`);
    }
  }

  if (!E164_REGEX.test(cleaned)) {
    throw new Error(`Invalid phone number format: "${cleaned}". Must be E.164 format like +12025551234.`);
  }

  console.log("[formatE164] Result:", cleaned);
  return cleaned;
}

async function callTwilioVerifyAPI(path: string, body: Record<string, string>) {
  const accountSid = stripNonPrintable(process.env.TWILIO_ACCOUNT_SID ?? "");
  const authToken = stripNonPrintable(process.env.TWILIO_AUTH_TOKEN ?? "");
  const serviceSid = stripNonPrintable(process.env.TWILIO_VERIFY_SERVICE_SID ?? "");

  console.log("[Twilio] accountSid:", JSON.stringify(accountSid));
  console.log("[Twilio] authToken length:", authToken.length);
  console.log("[Twilio] serviceSid:", JSON.stringify(serviceSid));

  if (!accountSid || !authToken || !serviceSid) {
    const missing: string[] = [];
    if (!accountSid) missing.push("TWILIO_ACCOUNT_SID");
    if (!authToken) missing.push("TWILIO_AUTH_TOKEN");
    if (!serviceSid) missing.push("TWILIO_VERIFY_SERVICE_SID");
    throw new Error(`Missing Twilio config: ${missing.join(", ")}`);
  }

  if (!accountSid.startsWith("AC")) {
    throw new Error(`Invalid TWILIO_ACCOUNT_SID: must start with 'AC', got '${accountSid.substring(0, 4)}...'`);
  }
  if (!serviceSid.startsWith("VA")) {
    throw new Error(`Invalid TWILIO_VERIFY_SERVICE_SID: must start with 'VA', got '${serviceSid.substring(0, 4)}...'`);
  }

  const url = `https://verify.twilio.com/v2/Services/${serviceSid}${path}`;
  const credentials = `${accountSid}:${authToken}`;
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(credentials).toString("base64")
    : btoa(credentials);
  const authHeader = `Basic ${base64}`;

  const formBody = Object.entries(body)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  console.log("[Twilio] POST", url);
  console.log("[Twilio] body params:", JSON.stringify(body));

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
    const twilioCode = String(json.code ?? "unknown");
    const twilioMsg = (json.message ?? json.error_message ?? "Unknown Twilio error") as string;
    const moreInfo = (json.more_info ?? "") as string;
    console.error("[Twilio] Error code:", twilioCode, "message:", twilioMsg, "more_info:", moreInfo);
    throw new Error(`Twilio error ${twilioCode}: ${twilioMsg}`);
  }

  return json;
}

export const verificationRouter = createTRPCRouter({
  sendSmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(8) }))
    .mutation(async ({ input }) => {
      console.log("[Verification] Raw phone input:", JSON.stringify(input.phone));
      console.log("[Verification] Phone char codes:", Array.from(input.phone).map(c => c.charCodeAt(0)));
      const e164 = formatE164(input.phone);
      console.log("[Verification] Sending SMS to:", JSON.stringify(e164));

      const result = await callTwilioVerifyAPI("/Verifications", {
        To: e164,
        Channel: "sms",
      });

      console.log("[Verification] Send result status:", result.status);
      return { success: true, status: result.status as string };
    }),

  verifySmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(8), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      console.log("[Verification] Raw phone input:", JSON.stringify(input.phone));
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
