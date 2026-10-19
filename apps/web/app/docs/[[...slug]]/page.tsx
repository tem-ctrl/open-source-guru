import type { InferPageType } from "fumadocs-core/source";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { createRelativeLink } from "fumadocs-ui/mdx";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ApiPage } from "@/components/ApiPage";
import { JsonLd } from "@/components/JsonLd";
import { getMDXComponents } from "@/components/MdxComponents";
import { ROUTES } from "@/lib/constants";
import { pageMetadata } from "@/lib/seo";
import { appName, githubRepoUrl, siteUrl } from "@/lib/shared";
import { docsOgImageUrl, source } from "@/lib/source";

type Props = PageProps<"/docs/[[...slug]]">;

// The params are read inside <Suspense>: the shell is shared by every docs URL, so navigating
// between pages stays instant while the page's content streams in.
export default function Page({ params }: Props) {
  return (
    <Suspense fallback={<DocsPageSkeleton />}>
      <DocsContent params={params} />
    </Suspense>
  );
}

async function DocsContent({ params }: Pick<Props, "params">) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const structuredData = <JsonLd data={docsStructuredData(page)} />;

  if (page.data.type === "openapi") {
    return (
      <DocsPage toc={page.data.toc} full>
        {structuredData}
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsDescription>{page.data.description}</DocsDescription>
        <PageActions page={page} />
        <DocsBody className="osg-openapi">
          <ApiPage {...page.data.getOpenAPIPageProps()} />
        </DocsBody>
      </DocsPage>
    );
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      {structuredData}
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <PageActions
        page={page}
        githubUrl={`${githubRepoUrl}/blob/main/apps/web/content/docs/${page.path}`}
      />
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

/**
 * Copy the page as Markdown, or open it in ChatGPT, Claude, etc. The prompts link to the
 * production URL; API reference pages have no source file, so no GitHub link.
 */
function PageActions({
  page,
  githubUrl,
}: {
  page: InferPageType<typeof source>;
  githubUrl?: string;
}) {
  const markdownUrl = `${page.url}.mdx`;
  return (
    <div className="flex flex-row items-center gap-2 border-b pb-6">
      <MarkdownCopyButton markdownUrl={markdownUrl} />
      <ViewOptionsPopover
        markdownUrl={markdownUrl}
        githubUrl={githubUrl}
        pageUrl={`${siteUrl}${page.url}`}
      />
    </div>
  );
}

/** schema.org: the page as a technical article, and its place in the docs (breadcrumbs). */
function docsStructuredData(page: InferPageType<typeof source>) {
  const url = `${siteUrl}${page.url}`;
  const crumbs = [
    { name: appName, url: siteUrl },
    { name: "Docs", url: `${siteUrl}${ROUTES.docs}` },
    ...(page.slugs.length > 0 ? [{ name: page.data.title, url }] : []),
  ];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: page.data.title,
        description: page.data.description,
        url,
        inLanguage: "en",
        isPartOf: { "@type": "WebSite", name: appName, url: siteUrl },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      },
    ],
  };
}

function DocsPageSkeleton() {
  return (
    <DocsPage toc={[]}>
      <div aria-busy="true" className="flex animate-pulse flex-col gap-4">
        <div className="h-9 w-2/3 rounded-md bg-fd-muted" />
        <div className="h-5 w-1/2 rounded-md bg-fd-muted" />
        <div className="mt-4 h-40 rounded-md bg-fd-muted" />
      </div>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  const title = page.data.title ?? "Docs";
  const description = page.data.description ?? `${title}: ${appName} documentation.`;

  return {
    title,
    ...pageMetadata({
      title: `${title} | ${appName} docs`,
      description,
      path: page.url,
      image: { url: docsOgImageUrl(page), alt: title },
      openGraphType: "article",
    }),
    // The same page as Markdown, for LLMs.
    alternates: { canonical: page.url, types: { "text/markdown": `${page.url}.mdx` } },
  };
}
