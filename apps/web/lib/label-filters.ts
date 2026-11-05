/**
 * Reserved entry of a subscription's labels: not a GitHub label, but the condition that an issue
 * has no open pull request linked to it. Same value as `HAS_NO_OPEN_PR` in `@osg/core`.
 */
export const HAS_NO_OPEN_PR = "has_no_open_pr";
export const HAS_NO_OPEN_PR_NAME = "has no open pr";

export const isNoOpenPrFilter = (label: string) => label.trim().toLowerCase() === HAS_NO_OPEN_PR;

/** How a subscription's label is shown to people. */
export const labelDisplayName = (label: string) =>
  isNoOpenPrFilter(label) ? HAS_NO_OPEN_PR_NAME : label;

/** The labels that exist on GitHub, without the conditions. */
export const realLabels = (labels: Iterable<string>) =>
  [...labels].filter((label) => !isNoOpenPrFilter(label));

/** Finishes "new issues…": "labeled bug, docs with no open PR". Empty without any label. */
export function describeIssues(labels: Iterable<string>): string {
  const all = [...labels];
  const names = realLabels(all);
  return [
    names.length > 0 ? `labeled ${names.join(", ")}` : "",
    names.length < all.length ? "with no open PR" : "",
  ]
    .filter(Boolean)
    .join(" ");
}
