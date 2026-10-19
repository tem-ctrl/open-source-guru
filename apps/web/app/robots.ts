import type { MetadataRoute } from "next";
import { ROUTES } from "@/lib/constants";
import { siteUrl } from "@/lib/shared";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pages behind sign-in, and the API (docs pages stay crawlable).
      disallow: [ROUTES.dashboard.feed, ROUTES.admin.overview, ROUTES.onboarding, "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
