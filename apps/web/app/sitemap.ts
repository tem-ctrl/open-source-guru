import type { MetadataRoute } from "next";
import { ROUTES } from "@/lib/constants";
import { siteUrl } from "@/lib/shared";
import { source } from "@/lib/source";

// Public pages only: the dashboard is behind sign-in. Public profiles are found through links
// (README badges, shared profiles) rather than listed, since profiles are public by default.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}${ROUTES.home}`, changeFrequency: "weekly", priority: 1 },
    ...source.getPages().map((page) => ({
      url: `${siteUrl}${page.url}`,
      changeFrequency: "monthly" as const,
      priority: page.url === ROUTES.docs ? 0.8 : 0.6,
    })),
  ];
}
