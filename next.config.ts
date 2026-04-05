import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@respan/respan",
    "@respan/tracing",
    "@respan/respan-sdk",
    "@respan/instrumentation-vercel",
  ],
};

export default nextConfig;
