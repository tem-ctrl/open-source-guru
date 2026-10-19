import { notFound } from "next/navigation";
import { getLLMText, source } from "@/lib/source";

// A docs page as Markdown. Served at /docs/<page>.mdx through a rewrite in next.config.ts.
export function generateStaticParams() {
  return source.generateParams();
}

export async function GET(
  _request: Request,
  { params }: RouteContext<"/llms.mdx/docs/[[...slug]]">,
) {
  const page = source.getPage((await params).slug);
  if (!page) notFound();
  return new Response(await getLLMText(page), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
