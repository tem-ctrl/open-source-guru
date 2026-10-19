import type { Node } from "fumadocs-core/page-tree";
import { ROUTES } from "@/lib/constants";
import { appName, githubRepoUrl, siteDescription, siteUrl } from "@/lib/shared";
import { source } from "@/lib/source";

// llms.txt (https://llmstxt.org): what the site is, then every docs page in navigation order,
// one section per sidebar separator. Pages link to their Markdown copy (/docs/<page>.mdx).
export async function GET() {
  const sections: string[] = [];
  for (const node of source.getPageTree().children) {
    if (node.type === "separator") sections.push(`\n## ${node.name}\n`);
    else sections.push(...listItems(node, 0));
  }

  const text = `# ${appName}

> ${siteDescription}

${appName} is free and open source. Users sign in with GitHub, follow repositories and pick
labels (such as "good first issue" or "help wanted"). They get an email, right away or as an
hourly or daily digest, when a new issue gets one of those labels; each email says whether the
issue is already assigned. Their Open Source Contributions (commits, pull requests, reviews,
issues and discussions in public, OSI-licensed repositories they don't own) are tracked with a
contribution graph, streaks, goals, and an optional public profile at
${siteUrl}/u/<github-login> with a README badge.

Everything in the dashboard is also available through a REST API at ${siteUrl}/api/v1,
authenticated with a personal API key (\`Authorization: Bearer osg_...\`).

## Docs
${sections.join("\n")}

## Optional

- [Full documentation](${siteUrl}/llms-full.txt): every page above in one Markdown file
- [OpenAPI document](${siteUrl}/api/docs/json): the REST API's request and response schemas
- [Source code](${githubRepoUrl}): the GitHub repository
- [Sign in](${siteUrl}${ROUTES.signIn}): sign in with GitHub to get started
`;

  return new Response(text, { headers: { "content-type": "text/markdown; charset=utf-8" } });
}

function listItems(node: Node, depth: number): string[] {
  const indent = "  ".repeat(depth);
  if (node.type === "page") {
    // API reference nav names are elements (method badge + title): use the page's title.
    const data = source.getNodePage(node)?.data;
    const description = data?.description ? `: ${data.description}` : "";
    return [`${indent}- [${data?.title ?? node.url}](${siteUrl}${node.url}.mdx)${description}`];
  }
  if (node.type === "folder") {
    return [
      `${indent}- ${node.name}`,
      ...(node.index ? listItems(node.index, depth + 1) : []),
      ...node.children.flatMap((child) => listItems(child, depth + 1)),
    ];
  }
  return [`${indent}- ${node.name}`];
}
