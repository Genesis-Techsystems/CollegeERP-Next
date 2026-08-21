import type { NextConfig } from "next";
import navRouteRedirects from "./src/lib/generated/nav-route-redirects.json";
import navRouteRewrites from "./src/lib/generated/nav-route-rewrites.json";

/** Browser URL keeps Angular path; App Router pages stay under flat `/admin/*`. */
const institutionalMastersRewrites = [
  {
    source: "/admin/institutional-masters/buildings",
    destination: "/admin/buildings",
  },
  {
    source: "/admin/institutional-masters/blocks",
    destination: "/admin/blocks",
  },
  {
    source: "/admin/institutional-masters/floors",
    destination: "/admin/floors",
  },
  {
    source: "/admin/institutional-masters/rooms",
    destination: "/admin/rooms",
  },
  {
    source: "/admin/institutional-masters/rooms-type",
    destination: "/admin/room-types",
  },
  {
    source: "/admin/institutional-masters/room-types",
    destination: "/admin/room-types",
  },
  {
    source: "/admin/institutional-masters/room-details",
    destination: "/admin/room-details",
  },
  {
    source: "/admin/institutional-masters/room-detail",
    destination: "/admin/room-details",
  },
];

/** Old flat URLs → Institutional Masters paths. */
const institutionalMastersRedirects = [
  {
    source: "/admin/buildings",
    destination: "/admin/institutional-masters/buildings",
    permanent: false,
  },
  {
    source: "/admin/blocks",
    destination: "/admin/institutional-masters/blocks",
    permanent: false,
  },
  {
    source: "/admin/floors",
    destination: "/admin/institutional-masters/floors",
    permanent: false,
  },
  {
    source: "/admin/rooms",
    destination: "/admin/institutional-masters/rooms",
    permanent: false,
  },
  {
    source: "/admin/room-types",
    destination: "/admin/institutional-masters/rooms-type",
    permanent: false,
  },
  {
    source: "/admin/room-details",
    destination: "/admin/institutional-masters/room-details",
    permanent: false,
  },
];

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
    return [...institutionalMastersRedirects, ...navRouteRedirects];
  },
  async rewrites() {
    return [...institutionalMastersRewrites, ...navRouteRewrites];
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
