import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

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
  const rawAccountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const rawAuthToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  const rawServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";

  const accountSid = rawAccountSid.replace(/[^\x20-\x7E]/g, "").trim();
  const authToken = rawAuthToken.replace(/[^\x20-\x7E]/g, "").trim();
  const serviceSid = rawServiceSid.replace(/[^\x20-\x7E]/g, "").trim();

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
    throw new Error(`Invalid TWILIO_ACCOUNT_SID: must start with 'AC', got '${accountSid.substring(0, 4)}...'`);
  }
  if (!serviceSid.startsWith("VA")) {
    throw new Error(`Invalid TWILIO_VERIFY_SERVICE_SID: must start with 'VA', got '${serviceSid.substring(0, 4)}...'`);
  }

  const url = `https://verify.twilio.com/v2/Services/${serviceSid}${path}`;
  const credentials = `${accountSid}:${authToken}`;
  const base64Auth = typeof Buffer !== "undefined"
    ? Buffer.from(credentials).toString("base64")
    : btoa(credentials);

  const formBody = Object.entries(body)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  console.log("[Twilio] POST", url);
  console.log("[Twilio] Body keys:", Object.keys(body).join(", "));
  console.log("[Twilio] Body values:", JSON.stringify(body));

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
    const moreInfo = typeof json.more_info === "string" ? json.more_info : "";
    console.error("[Twilio] ERROR - code:", twilioCode, "message:", twilioMsg, "more_info:", moreInfo);
    throw new Error(`Twilio error (${twilioCode}): ${twilioMsg}. Check: ${moreInfo}`);
  }

  return json;
}

export const verificationRouter = createTRPCRouter({
  checkTwilioConfig: publicProcedure
    .query(async () => {
      const rawAccountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
      const rawAuthToken = process.env.TWILIO_AUTH_TOKEN ?? "";
      const rawServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";

      const accountSid = rawAccountSid.replace(/[^\x20-\x7E]/g, "").trim();
      const authToken = rawAuthToken.replace(/[^\x20-\x7E]/g, "").trim();
      const serviceSid = rawServiceSid.replace(/[^\x20-\x7E]/g, "").trim();

      const config = {
        accountSidPresent: accountSid.length > 0,
        accountSidPrefix: accountSid.substring(0, 4),
        accountSidLength: accountSid.length,
        authTokenPresent: authToken.length > 0,
        authTokenLength: authToken.length,
        serviceSidPresent: serviceSid.length > 0,
        serviceSidPrefix: serviceSid.substring(0, 4),
        serviceSidLength: serviceSid.length,
        serviceSidFull: serviceSid,
        serviceCheck: "pending" as string,
      };

      console.log("[TwilioCheck] Config:", JSON.stringify(config));

      if (accountSid && authToken && serviceSid) {
        try {
          const url = `https://verify.twilio.com/v2/Services/${serviceSid}`;
          const credentials = `${accountSid}:${authToken}`;
          const base64Auth = typeof Buffer !== "undefined"
            ? Buffer.from(credentials).toString("base64")
            : btoa(credentials);

          console.log("[TwilioCheck] Fetching service:", url);
          const resp = await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Basic ${base64Auth}` },
          });

          const text = await resp.text();
          console.log("[TwilioCheck] Service response:", resp.status, text.substring(0, 500));

          if (resp.ok) {
            const data = JSON.parse(text);
            config.serviceCheck = `OK - Service: ${data.friendly_name ?? "unknown"}`;
          } else {
            config.serviceCheck = `FAILED (HTTP ${resp.status}): ${text.substring(0, 200)}`;
          }
        } catch (err) {
          config.serviceCheck = `ERROR: ${err instanceof Error ? err.message : String(err)}`;
        }
      } else {
        config.serviceCheck = "MISSING_CREDENTIALS";
      }

      return config;
    }),

  sendSmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(8) }))
    .mutation(async ({ input }) => {
      console.log("[Verification] sendSmsCode called with phone:", JSON.stringify(input.phone));
      console.log("[Verification] Phone char codes:", Array.from(input.phone).map(c => c.charCodeAt(0)));

      try {
        const e164 = formatE164(input.phone);
        console.log("[Verification] Formatted E.164:", JSON.stringify(e164));

        const result = await callTwilioVerifyAPI("/Verifications", {
          To: e164,
          Channel: "sms",
        });

        console.log("[Verification] Success! Status:", result.status);
        return { success: true, status: result.status as string };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Verification] FAILED:", msg);
        throw error;
      }
    }),

  verifySmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(8), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      console.log("[Verification] verifySmsCode called with phone:", JSON.stringify(input.phone));

      try {
        const e164 = formatE164(input.phone);
        console.log("[Verification] Checking code for:", e164);

        const result = await callTwilioVerifyAPI("/VerificationCheck", {
          To: e164,
          Code: input.code,
        });

        const approved = result.status === "approved";
        console.log("[Verification] Result:", approved ? "APPROVED" : "DENIED");
        return { success: approved, status: result.status as string };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[Verification] Verify FAILED:", msg);
        throw error;
      }
    }),
});
