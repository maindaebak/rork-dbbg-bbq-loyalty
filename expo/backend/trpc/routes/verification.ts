import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_VERIFY_SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";

async function twilioFetch(path: string, body: Record<string, string>) {
  const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}${path}`;
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

  const formBody = Object.entries(body)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  console.log("[Twilio] POST", url);

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
    throw new Error(data.message ?? "Twilio request failed");
  }

  return data;
}

export const verificationRouter = createTRPCRouter({
  sendSmsCode: publicProcedure
    .input(z.object({ phone: z.string().min(10) }))
    .mutation(async ({ input }) => {
      const digits = input.phone.replace(/\D/g, "");
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      console.log("[Verification] Sending SMS to", e164);

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
        throw new Error("Twilio credentials not configured on server");
      }

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
      const e164 = digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

      console.log("[Verification] Verifying SMS code for", e164);

      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
        throw new Error("Twilio credentials not configured on server");
      }

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
