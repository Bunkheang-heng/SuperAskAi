import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The knowledge base is read from disk at request time in the Node runtime.
  // Keep it out of the client bundle.
  serverExternalPackages: ["@anthropic-ai/sdk"],
  // Do not announce the framework. It tells a scanner picking targets by stack
  // exactly what this is, and buys nothing. The reverse proxy also strips it,
  // but a deployment should not depend on the proxy to avoid disclosing this.
  poweredByHeader: false,
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
