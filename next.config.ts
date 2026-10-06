import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

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
      // Telegram Mini App — must be embeddable (no X-Frame-Options: DENY).
      {
        source: "/chat",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://web.telegram.org https://telegram.org https://*.telegram.org;",
          },
        ],
      },
      // Everything else stays unframed.
      {
        source: "/",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/login",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/register",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
