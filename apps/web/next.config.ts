import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No `x-powered-by: Next.js` header.
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  // Self-hosted with Docker; trace files from the monorepo root.
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // Read with fs by the Open Graph images (lib/og.tsx); profile cards render on request.
  outputFileTracingIncludes: { "/u/**": ["./assets/fonts/*.ttf"] },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The browser only talks to the web app; /api/* is forwarded to the Fastify API
  // over the internal network, so cookies stay first-party and CORS isn't needed.
  // Better Auth is served at /api/auth/* on the API too, so that path is kept as is.
  async rewrites() {
    return [
      // README badges have a short public URL next to the profile.
      {
        source: "/u/:login/badge.svg",
        destination: `${apiInternalUrl}/v1/public/profiles/:login/badge.svg`,
      },
      // Docs pages as Markdown for LLMs (see app/llms.mdx).
      { source: "/docs.mdx", destination: "/llms.mdx/docs" },
      { source: "/docs/:path*.mdx", destination: "/llms.mdx/docs/:path*" },
      { source: "/api/auth/:path*", destination: `${apiInternalUrl}/api/auth/:path*` },
      { source: "/api/:path*", destination: `${apiInternalUrl}/:path*` },
    ];
  },
};

export default withMDX(nextConfig);
