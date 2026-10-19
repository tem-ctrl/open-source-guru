// Tells search engines that use IndexNow (Bing, Yandex, Seznam, Naver…) to recrawl the site,
// so docs changes show up in hours instead of weeks. Run it after a deploy:
//
//   node scripts/indexnow.ts                          # every URL in the live sitemap
//   node scripts/indexnow.ts /docs/streaks /docs/faq  # only these pages
//
// The key is public by design: search engines check it's served at /<key>.txt (in public/).
// SITE_URL overrides the site (default: production).

import process from "node:process";

const KEY = "874a489841c04a872d3330bb0b39b65e";
const siteUrl = (process.env.SITE_URL ?? "https://open-source-guru.dev").replace(/\/$/, "");

async function sitemapUrls(): Promise<string[]> {
  const response = await fetch(`${siteUrl}/sitemap.xml`);
  if (!response.ok) throw new Error(`Reading the sitemap failed (HTTP ${response.status})`);
  return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
}

const paths = process.argv.slice(2);
const urlList = paths.length > 0 ? paths.map((path) => `${siteUrl}${path}`) : await sitemapUrls();

// Make sure the key file is live first: otherwise the submission is rejected (403).
const keyLocation = `${siteUrl}/${KEY}.txt`;
const keyFile = await fetch(keyLocation);
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  throw new Error(`${keyLocation} doesn't serve the IndexNow key: deploy the web app first`);
}

// api.indexnow.org shares the submission with every participating search engine.
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(siteUrl).host, key: KEY, keyLocation, urlList }),
});
// 200: received; 202: received, key validation pending.
if (response.status !== 200 && response.status !== 202) {
  throw new Error(
    `IndexNow rejected the submission (HTTP ${response.status}): ${await response.text()}`,
  );
}
console.log(`Submitted ${urlList.length} URLs to IndexNow (HTTP ${response.status})`);
