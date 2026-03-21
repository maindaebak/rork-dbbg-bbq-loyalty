import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

const recipientSchema = z.object({
  phone: z.string(),
  name: z.string(),
});

export const smsRouter = createTRPCRouter({
  sendMarketing: publicProcedure
    .input(
      z.object({
        recipients: z.array(recipientSchema).min(1),
        message: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.EXPO_PUBLIC_TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromPhone) {
        console.error("[SMS] Missing Twilio credentials", {
          hasSid: !!accountSid,
          hasToken: !!authToken,
          hasFrom: !!fromPhone,
        });
        throw new Error("SMS service is not configured. Missing Twilio credentials.");
      }

      console.log(`[SMS] Sending marketing SMS to ${input.recipients.length} recipients`);
      console.log(`[SMS] From: ${fromPhone}`);
      console.log(`[SMS] Message length: ${input.message.length}`);

      const results: { phone: string; success: boolean; error?: string }[] = [];

      for (const recipient of input.recipients) {
        try {
          const toPhone = recipient.phone.startsWith("+")
            ? recipient.phone
            : `+${recipient.phone}`;

          console.log(`[SMS] Sending to ${recipient.name} (${toPhone})`);

          const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          const auth = btoa(`${accountSid}:${authToken}`);

          const body = new URLSearchParams({
            To: toPhone,
            From: fromPhone,
            Body: input.message,
          });

          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error(`[SMS] Failed to send to ${toPhone}:`, data.message || data);
            results.push({
              phone: toPhone,
              success: false,
              error: data.message || "Unknown Twilio error",
            });
          } else {
            console.log(`[SMS] Sent to ${toPhone}, SID: ${data.sid}`);
            results.push({ phone: toPhone, success: true });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[SMS] Exception sending to ${recipient.phone}:`, msg);
          results.push({ phone: recipient.phone, success: false, error: msg });
        }
      }

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      console.log(`[SMS] Done. Success: ${successCount}, Failed: ${failCount}`);

      return {
        success: failCount === 0,
        sent: successCount,
        failed: failCount,
        total: input.recipients.length,
        results,
      };
    }),
});
