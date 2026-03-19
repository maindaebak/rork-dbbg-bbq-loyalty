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
    version: 3,
    time: new Date().toISOString(),
  });
});

console.log("[Backend] Server ready");

export default app;
