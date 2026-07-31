import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The knowledge base is read from disk at request time in the Node runtime.
  // Keep it out of the client bundle.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
