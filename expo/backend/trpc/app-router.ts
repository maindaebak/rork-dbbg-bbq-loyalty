import { createTRPCRouter } from "./create-context";
import { adminRouter } from "./routes/admin";
import { emailRouter } from "./routes/email";
import { verificationRouter } from "./routes/verification";

export const appRouter = createTRPCRouter({
  verification: verificationRouter,
  email: emailRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
