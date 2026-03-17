import * as z from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Dae Bak Bon Ga <noreply@dae-bak.com>";

function generateEmailCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const emailCodes = new Map<string, { code: string; expiresAt: number }>();

export const emailRouter = createTRPCRouter({
  sendVerification: publicProcedure
    .input(z.object({ email: z.string().email(), memberName: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[Email] Sending verification email to", input.email);

      if (!RESEND_API_KEY) {
        throw new Error("Email service not configured on server");
      }

      const code = generateEmailCode();
      emailCodes.set(input.email.toLowerCase(), {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [input.email],
          subject: "Verify your email - Dae Bak Bon Ga Rewards",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #1A120E; color: #FFF7ED; border-radius: 16px;">
              <h1 style="font-size: 24px; font-weight: 900; margin: 0 0 8px;">Dae Bak Bon Ga</h1>
              <p style="color: #C8AA94; font-size: 14px; margin: 0 0 24px;">Korean Restaurant Rewards Program</p>
              <hr style="border: none; border-top: 1px solid rgba(247,197,139,0.2); margin: 0 0 24px;" />
              <p style="font-size: 16px; margin: 0 0 8px;">Hi ${input.memberName},</p>
              <p style="color: #D7BDA9; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Use the verification code below to confirm your email address and activate your rewards account.
              </p>
              <div style="background: rgba(247,197,139,0.12); border: 1px solid rgba(247,197,139,0.25); border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 24px;">
                <p style="font-size: 36px; font-weight: 900; letter-spacing: 8px; margin: 0; color: #F7C58B;">${code}</p>
              </div>
              <p style="color: #C8AA94; font-size: 12px; margin: 0;">This code expires in 10 minutes. If you didn't sign up, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      const data = await res.json();
      console.log("[Email] Resend response:", res.status, JSON.stringify(data));

      if (!res.ok) {
        throw new Error(data.message ?? "Failed to send verification email");
      }

      return { success: true };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
    .mutation(async ({ input }) => {
      console.log("[Email] Verifying email code for", input.email);

      const stored = emailCodes.get(input.email.toLowerCase());

      if (!stored) {
        return { success: false, reason: "No verification code found. Please request a new one." };
      }

      if (Date.now() > stored.expiresAt) {
        emailCodes.delete(input.email.toLowerCase());
        return { success: false, reason: "Verification code has expired. Please request a new one." };
      }

      if (stored.code !== input.code) {
        return { success: false, reason: "Invalid verification code. Please try again." };
      }

      emailCodes.delete(input.email.toLowerCase());
      console.log("[Email] Email verified successfully:", input.email);

      return { success: true };
    }),
});
