/**
 * Structured data (schema.org) for search engines and AI crawlers. `<` is escaped so strings
 * from users (profile names, bios) can't close the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: escaped JSON, not HTML
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
