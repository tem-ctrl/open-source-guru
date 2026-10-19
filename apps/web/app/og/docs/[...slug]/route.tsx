import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { OgFooter, OgFrame, ogColors } from "@/lib/og";
import { docsOgImageUrl, source } from "@/lib/source";

// One Open Graph card per docs page, generated at build time. The last segment is the
// file name ("image.png") so the URL ends in .png; the docs index is /og/docs/image.png.
export function generateStaticParams() {
  return source.getPages().map((page) => ({ slug: docsOgImageUrl(page).split("/").slice(3) }));
}

export async function GET(_request: Request, { params }: RouteContext<"/og/docs/[...slug]">) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return new ImageResponse(
    <OgFrame>
      <span style={{ fontSize: 28, color: ogColors.coral, fontWeight: 800 }}>Documentation</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <span style={{ fontSize: 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          {page.data.title}
        </span>
        {page.data.description && (
          <span style={{ fontSize: 36, color: ogColors.wisteria, lineHeight: 1.35 }}>
            {page.data.description}
          </span>
        )}
      </div>
      <OgFooter label="open-source-guru.dev/docs" />
    </OgFrame>,
    { width: 1200, height: 630 },
  );
}
