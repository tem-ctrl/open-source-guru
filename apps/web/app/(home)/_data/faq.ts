import { ROUTES } from "@/lib/constants";

/** Landing page FAQ: short answers, with the details in the docs (content/docs/faq.mdx). */
export const faq: { question: string; answer: string; link?: { text: string; href: string } }[] = [
  {
    question: "Is Open Source Guru free?",
    answer:
      "Yes. It's free and open source, and built to run on a small budget. Sign in with GitHub and follow up to 50 repositories.",
  },
  {
    question: "How do I find a good first issue on GitHub?",
    answer:
      "Follow the repositories you'd like to contribute to and pick labels such as good first issue or help wanted. When a new issue gets one of those labels, or the label is added to an existing issue, you get an email that says whether someone is already assigned.",
    link: { text: "Getting started", href: `${ROUTES.docs}/getting-started` },
  },
  {
    question: "How fast are the emails?",
    answer:
      "Repositories are checked every couple of minutes. Instant emails usually arrive within 5 to 10 minutes; you can also get an hourly or daily digest instead.",
    link: { text: "How it works", href: `${ROUTES.docs}/how-it-works` },
  },
  {
    question: "What counts as an Open Source Contribution?",
    answer:
      "Commits, pull requests, reviews, issues and discussions in public, OSI-licensed repositories that you don't own. Your dashboard shows them in a contribution graph, with streaks and goals to keep you going.",
    link: { text: "What counts", href: `${ROUTES.docs}/contributions` },
  },
  {
    question: "Can I show my contributions on my GitHub profile?",
    answer:
      "Yes. Your public profile has a README badge with your Open Source Contributions of the last 12 months and your current streak. You can turn the profile off at any time.",
    link: { text: "Public profile and badge", href: `${ROUTES.docs}/profile` },
  },
  {
    question: "Can I use it from my own scripts?",
    answer:
      "Yes. Everything in the dashboard is available through a REST API, with a personal API key you create in your settings.",
    link: { text: "API quickstart", href: `${ROUTES.docs}/api` },
  },
];
