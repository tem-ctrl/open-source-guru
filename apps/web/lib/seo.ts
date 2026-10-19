import type { Metadata } from "next";
import { appName, siteImageAlt } from "./shared";

interface PageSeo {
  /** The full title for social cards (the <title> uses the layout's template). */
  title: string;
  description: string;
  /** The page's path: its canonical URL and `og:url`. Omit for pages without one. */
  path?: string;
  /**
   * The social card; defaults to the site's (app/opengraph-image.tsx). Pass `null` when the
   * route has its own `opengraph-image` file: Next.js only uses the file when `images` is unset.
   */
  image?: { url: string; alt: string } | null;
  openGraphType?: "website" | "article" | "profile";
}

/**
 * Description, canonical URL, Open Graph and Twitter card for a page. Next.js merges metadata
 * one key deep, so a page's `openGraph` replaces the layout's (image included): this builds the
 * whole object.
 */
export function pageMetadata({
  title,
  description,
  path,
  image = { url: "/opengraph-image", alt: siteImageAlt },
  openGraphType = "website",
}: PageSeo): Pick<Metadata, "description" | "alternates" | "openGraph" | "twitter"> {
  const images = image ? [{ ...image, width: 1200, height: 630 }] : undefined;
  return {
    description,
    ...(path && { alternates: { canonical: path } }),
    openGraph: {
      type: openGraphType,
      siteName: appName,
      locale: "en_US",
      title,
      description,
      ...(path && { url: path }),
      ...(images && { images }),
    },
    twitter: { card: "summary_large_image", title, description, ...(images && { images }) },
  };
}
