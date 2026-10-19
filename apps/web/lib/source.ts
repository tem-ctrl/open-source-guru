import { type InferPageType, loader, multiple } from "fumadocs-core/source";
import { metaSchema, pageSchema } from "fumadocs-core/source/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import { ROUTES } from "./constants";
import { openapi } from "./openapi";
import { siteUrl } from "./shared";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const docs = defineDocs({
  dir: "content/docs",
  // Processed Markdown (MDX components flattened) feeds llms.txt and the .mdx page copies.
  docs: { schema: pageSchema, postprocess: { includeProcessedMarkdown: { headingIds: false } } },
  meta: { schema: metaSchema },
});

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    // API reference: one page per endpoint, grouped by tag, named after its summary.
    openapi: await openapi.staticSource({
      baseDir: "api/reference",
      groupBy: "tag",
      name: ({ info }: { info: { title: string } }) => slugify(info.title),
      meta: true,
    }),
  }),
  { baseUrl: ROUTES.docs, plugins: [openapi.loaderPlugin()] },
);

type DocsPage = InferPageType<typeof source>;

/** The page's Open Graph image (app/og/docs/[...slug]/route.tsx). */
export function docsOgImageUrl(page: DocsPage): string {
  return `/og/docs/${[...page.slugs, "image.png"].join("/")}`;
}

/** Root-relative Markdown links made absolute: LLM tools read these files out of context. */
const absoluteLinks = (markdown: string) => markdown.replace(/\]\(\//g, `](${siteUrl}/`);

/** The page as Markdown, for LLMs: llms-full.txt and /docs/<page>.mdx. */
export async function getLLMText(page: DocsPage): Promise<string> {
  const heading = `# ${page.data.title} (${siteUrl}${page.url})`;
  const intro = page.data.description ? `\n\n${page.data.description}` : "";
  // API reference pages are generated from the OpenAPI document: list the endpoint instead.
  if (page.data.type === "openapi") {
    const endpoints = (page.data.getOpenAPIPageProps().operations ?? []).map(
      ({ method, path }) => `- \`${method.toUpperCase()} ${siteUrl}/api${path}\``,
    );
    return `${heading}${intro}\n\n${endpoints.join("\n")}\n\nRequest and response schemas: ${siteUrl}/api/docs/json`;
  }
  return `${heading}${intro}\n\n${absoluteLinks(await page.data.getText("processed"))}`;
}
