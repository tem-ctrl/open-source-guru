import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { ROUTES } from "@/lib/constants";
import { faq } from "../_data/faq";

/** schema.org: the questions and answers, for search engines and AI assistants. */
const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
};

/** Landing page section: common questions, linking to the docs for details. */
export function FaqSection() {
  return (
    <section className="border-t border-border bg-surface">
      <JsonLd data={structuredData} />
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">FAQ</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
          <p className="text-subtle">
            More in the{" "}
            <Link
              href={`${ROUTES.docs}/faq`}
              className="font-semibold text-primary hover:text-accent"
            >
              full FAQ
            </Link>
            .
          </p>
        </div>
        <dl className="flex flex-col divide-y divide-border">
          {faq.map(({ question, answer, link }) => (
            <div key={question} className="flex flex-col gap-2 py-5 first:pt-0 last:pb-0">
              <dt>
                <h3 className="text-lg font-semibold">{question}</h3>
              </dt>
              <dd className="text-subtle">
                {answer}
                {link && (
                  <>
                    {" "}
                    <Link href={link.href} className="font-semibold text-primary hover:text-accent">
                      {link.text}
                    </Link>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
