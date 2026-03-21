import { createTRPCRouter } from "./create-context";
import { smsRouter } from "./routes/sms";

export const appRouter = createTRPCRouter({
  sms: smsRouter,
});

export type AppRouter = typeof appRouter;
