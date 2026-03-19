import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

function getTwilioConfig() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  console.log("[Twilio] Config check - AccountSID length:", accountSid.length, "starts:", accountSid.substring(0, 4));
  console.log("[Twilio] Config check - AuthToken length:", authToken.length);
  console.log("[Twilio] Config check - ServiceSID length:", serviceSid.length, "starts:", serviceSid.substring(0, 4));

  if (!accountSid || !authToken || !serviceSid) {
    const missing = [
      !accountSid && "TWILIO_ACCOUNT_SID",
      !authToken && "TWILIO_AUTH_TOKEN",
      !serviceSid && "TWILIO_VERIFY_SERVICE_SID",
    ].filter(Boolean).join(", ");
    throw new Error(`Twilio credentials missing: ${missing}`);
  }

  if (!accountSid.startsWith("AC")) {
    throw new Error("TWILIO_ACCOUNT_SID must start with 'AC'");
  }

  if (!serviceSid.startsWith("VA")) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID must start with 'VA'");
  }

  return { accountSid, authToken, serviceSid };
}

function toBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function twilioFetch(path: string, body: Record<string, string>) {
  const { accountSid, authToken, serviceSid } = getTwilioConfig();
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}${path}`;
  const credentials = toBase64(`${accountSid}:${authToken}`);

  const formBody = Object.entries(body)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  console.log("[Twilio] POST", url);
  console.log("[Twilio] Body:", formBody);
  console.log("[Twilio] Auth header length:", credentials.length);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const rawText = await res.text();
    console.log("[Twilio] Response status:", res.status, "raw:", rawText.substring(0, 500));

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[Twilio] Failed to parse response as JSON");
      throw new Error(`Twilio returned non-JSON response (status ${res.status}): ${rawText.substring(0, 200)}`);
    }

    if (!res.ok) {
      const errMsg = (data.message ?? data.error_message ?? "Twilio request failed") as string;
      console.error("[Twilio] Error:", errMsg, "Code:", data.code, "More info:", data.more_info);
      throw new Error(errMsg);
    }

    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Twilio")) {
      throw error;
    }
    console.error("[Twilio] Fetch error:", error);
    throw new Error(`Failed to connect to Twilio: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const verificationRouter = createTRPCRouter({
  sendSmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const digits = input.phone.replace(/\D/g, "");
      let e164: string;
      if (digits.length === 11 && digits.startsWith("1")) {
        e164 = `+${digits}`;
      } else if (digits.length === 10) {
        e164 = `+1${digits}`;
      } else {
        throw new Error(`Invalid phone number: expected 10 digits, got ${digits.length}`);
      }

      console.log("[Verification] Sending SMS to", e164, "(raw input:", input.phone, ")");

      const result = await twilioFetch("/Verifications", {
        To: e164,
        Channel: "sms",
      });

      return {
        success: true,
        status: result.status as string,
      };
    }),

  verifySmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(10), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      const digits = input.phone.replace(/\D/g, "");
      let e164: string;
      if (digits.length === 11 && digits.startsWith("1")) {
        e164 = `+${digits}`;
      } else if (digits.length === 10) {
        e164 = `+1${digits}`;
      } else {
        throw new Error(`Invalid phone number: expected 10 digits, got ${digits.length}`);
      }

      console.log("[Verification] Verifying SMS code for", e164, "(raw input:", input.phone, ")");

      const result = await twilioFetch("/VerificationCheck", {
        To: e164,
        Code: input.code,
      });

      const approved = result.status === "approved";
      console.log("[Verification] SMS verification result:", approved ? "APPROVED" : "DENIED");

      return {
        success: approved,
        status: result.status as string,
      };
    }),
});
