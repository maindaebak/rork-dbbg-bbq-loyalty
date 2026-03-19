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

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

const healthCheck = (c: any) =>
  c.json({
    status: "ok",
    message: "Dae Bak Bon Ga API is running",
    time: new Date().toISOString(),
  });

app.get("/", healthCheck);
app.get("/api", healthCheck);
app.get("/api/", healthCheck);

const twilioCheck = (c: any) => {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID ?? "").trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN ?? "").trim();
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();

  return c.json({
    accountSidPresent: accountSid.length > 0,
    accountSidStartsWithAC: accountSid.startsWith("AC"),
    authTokenPresent: authToken.length > 0,
    serviceSidPresent: serviceSid.length > 0,
    serviceSidStartsWithVA: serviceSid.startsWith("VA"),
  });
};

app.get("/twilio-check", twilioCheck);
app.get("/api/twilio-check", twilioCheck);

console.log("[Backend] Server ready");

export default app;
