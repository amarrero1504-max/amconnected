import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev debug channel waits on the HMR websocket before hydrating.
  // If that socket cannot connect, the page stays on the loading shell.
  // Phones on the LAN use a private address, not localhost. Without these
  // patterns Next refuses the dev assets and the page never finishes loading.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],
  experimental: {
    reactDebugChannel: false,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
