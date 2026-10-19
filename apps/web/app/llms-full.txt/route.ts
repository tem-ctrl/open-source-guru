import { getLLMText, source } from "@/lib/source";

// Every docs page as Markdown, in one file (see /llms.txt).
export async function GET() {
  const pages = await Promise.all(source.getPages().map(getLLMText));
  return new Response(pages.join("\n\n"), {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
