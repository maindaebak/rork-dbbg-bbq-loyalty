import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

function getTwilioConfig() {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  console.log("[Twilio] Config check - SID starts with:", accountSid.substring(0, 4), "Service starts with:", serviceSid.substring(0, 4));

  if (!accountSid || !authToken || !serviceSid) {
    throw new Error("Twilio credentials not configured on server");
  }

  return { accountSid, authToken, serviceSid };
}

function toBase64(str: string): string {
  try {
    return Buffer.from(str, "utf-8").toString("base64");
  } catch {
    return btoa(str);
  }
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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody,
  });

  const data = await res.json();
  console.log("[Twilio] Response status:", res.status, "body:", JSON.stringify(data));

  if (!res.ok) {
    const errMsg = data.message ?? data.error_message ?? "Twilio request failed";
    console.error("[Twilio] Error:", errMsg, "Code:", data.code, "More info:", data.more_info);
    throw new Error(errMsg);
  }

  return data;
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
