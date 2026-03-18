import { createTRPCRouter } from "./create-context";
import { adminRouter } from "./routes/admin";
import { verificationRouter } from "./routes/verification";

export const appRouter = createTRPCRouter({
  verification: verificationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
