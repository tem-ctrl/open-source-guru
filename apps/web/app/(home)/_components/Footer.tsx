import Link from "next/link";
import { AccountLink } from "@/components/auth/AccountLink";
import { ROUTES } from "@/lib/constants";
import { appName, githubRepoUrl } from "@/lib/shared";
import { ShareLinks } from "./ShareLinks";

/** The main docs pages, so every visitor (and crawler) is one click from them. */
const docsLinks = [
  { text: "Getting started", href: `${ROUTES.docs}/getting-started` },
  { text: "How it works", href: `${ROUTES.docs}/how-it-works` },
  { text: "Subscriptions", href: `${ROUTES.docs}/subscriptions` },
  { text: "Contributions", href: `${ROUTES.docs}/contributions` },
  { text: "Streaks", href: `${ROUTES.docs}/streaks` },
  { text: "Goals", href: `${ROUTES.docs}/goals` },
  { text: "Public profile", href: `${ROUTES.docs}/profile` },
  { text: "API", href: `${ROUTES.docs}/api` },
  { text: "FAQ", href: `${ROUTES.docs}/faq` },
];

export function Footer() {
  return (
    <footer className="border-t border-border text-sm text-muted">
      <nav aria-label="Documentation" className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {docsLinks.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="hover:text-foreground leading-6 md:leading-normal">
                {link.text}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>
          {appName} is open source.{" "}
          <a
            href={githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:text-accent"
          >
            View on GitHub
          </a>
        </p>
        <ShareLinks />
        <nav aria-label="Footer" className="flex gap-6">
          <Link href={ROUTES.docs} className="hover:text-foreground">
            Docs
          </Link>
          <AccountLink variant="link" />
        </nav>
      </div>
    </footer>
  );
}
