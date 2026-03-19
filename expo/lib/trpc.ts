import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const url = (process.env.EXPO_PUBLIC_RORK_API_BASE_URL ?? "").trim();

  console.log("[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL raw:", JSON.stringify(process.env.EXPO_PUBLIC_RORK_API_BASE_URL));
  console.log("[tRPC] Base URL resolved to:", JSON.stringify(url));

  if (!url) {
    console.error("[tRPC] EXPO_PUBLIC_RORK_API_BASE_URL is not set! tRPC calls will fail.");
    return "";
  }

  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const resolvedUrl = `${getBaseUrl()}/api/trpc`;
console.log("[tRPC] Full endpoint URL:", resolvedUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: resolvedUrl,
      transformer: superjson,
    }),
  ],
});
