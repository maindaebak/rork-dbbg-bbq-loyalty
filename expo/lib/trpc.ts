import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

function getTrpcUrl(): string {
  const url = (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "").trim();
  console.log("[tRPC] Base URL:", JSON.stringify(url));

  if (!url) {
    console.error("[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL is not set!");
    return "";
  }

  const base = url.endsWith("/") ? url.slice(0, -1) : url;
  const full = `${base}/api/trpc`;
  console.log("[tRPC] Full endpoint URL:", full);
  return full;
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: getTrpcUrl(),
      transformer: superjson,
    }),
  ],
});
