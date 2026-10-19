export const appName = "Open Source Guru";

/** This project's repository on GitHub. */
export const githubRepo = {
  owner: "tem-ctrl",
  name: "open-source-guru",
  url: "https://github.com/tem-ctrl/open-source-guru",
} as const;

export const githubRepoUrl = githubRepo.url;

/** The production origin: canonical URLs, sitemaps and Open Graph images are absolute to it. */
export const siteUrl = "https://open-source-guru.dev";

/** One line about the product, for titles and social cards. */
export const tagline = "Your next good first issue is waiting.";

/** The default meta description (~155 characters, the length search engines show). */
export const siteDescription =
  "Get an email when GitHub issues labeled good first issue or help wanted appear in repos you follow. Track your open-source contributions, streaks and goals.";

/** Alt text of the site's default social card (app/opengraph-image.tsx). */
export const siteImageAlt = "Open Source Guru: get emailed about GitHub issues you can help with";
