import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

console.log("[Backend] Starting Dae Bak Bon Ga API server...");

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

app.get("/", (c) => {
  return c.json({
    status: "ok",
    message: "Dae Bak Bon Ga API is running",
    version: 6,
    time: new Date().toISOString(),
  });
});

app.get("/twilio-check", (c) => {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  return c.json({
    accountSid: accountSid ? `${accountSid.substring(0, 6)}...${accountSid.substring(accountSid.length - 4)}` : "MISSING",
    accountSidLength: accountSid.length,
    accountSidStartsWithAC: accountSid.startsWith("AC"),
    authTokenLength: authToken.length,
    authTokenPresent: authToken.length > 0,
    serviceSid: serviceSid ? `${serviceSid.substring(0, 6)}...${serviceSid.substring(serviceSid.length - 4)}` : "MISSING",
    serviceSidLength: serviceSid.length,
    serviceSidStartsWithVA: serviceSid.startsWith("VA"),
    hasNonPrintableInSid: /[^\x20-\x7E]/.test(accountSid),
    hasNonPrintableInToken: /[^\x20-\x7E]/.test(authToken),
    hasNonPrintableInService: /[^\x20-\x7E]/.test(serviceSid),
  });
});

console.log("[Backend] Server ready");

export default app;
