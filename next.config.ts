import type { NextConfig } from "next";
import navRouteRedirects from "./src/lib/generated/nav-route-redirects.json";
import navRouteRewrites from "./src/lib/generated/nav-route-rewrites.json";

const nextConfig: NextConfig = {
  // Emit a self-contained deployable at .next/standalone (server.js + minimal
  // node_modules). After build, copy .next/static and public/ alongside it.
  output: "standalone",
  typescript: {
    // Migration in progress — strict checks run via `npx tsc --noEmit` in CI when ready.
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return navRouteRedirects;
  },
  async rewrites() {
    return navRouteRewrites;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
