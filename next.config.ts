import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["iron-session"],
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
