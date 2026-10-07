import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev debug channel waits on the HMR websocket before hydrating.
  // If that socket cannot connect, the page stays on the loading shell.
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
