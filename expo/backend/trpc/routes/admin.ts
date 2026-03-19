import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "../create-context";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

export const adminRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      console.log("[Admin] Login attempt for", input.email);

      if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
        throw new Error("Admin credentials not configured on server");
      }

      const emailMatch = input.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();
      const passwordMatch = input.password === ADMIN_PASSWORD;

      if (!emailMatch || !passwordMatch) {
        console.log("[Admin] Login failed - invalid credentials");
        throw new Error("Invalid admin credentials");
      }

      console.log("[Admin] Login successful for", input.email);

      return {
        success: true,
        email: input.email.trim().toLowerCase(),
      };
    }),
});
