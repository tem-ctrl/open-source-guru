import type { IssueEventType, IssueLabel } from "../db/schema/github.ts";
import type { LabelMatch } from "../db/schema/notifications.ts";

/**
 * Reserved entry of a subscription's labels: not a GitHub label, but a condition that the issue
 * has no open pull request linked to it. Always required on top of the real labels, whichever
 * way those combine (`labelMatch`).
 */
export const HAS_NO_OPEN_PR = "has_no_open_pr";

export interface SubscriptionFilter {
  eventTypes: IssueEventType[];
  /** Label names, and possibly `HAS_NO_OPEN_PR`; no real label means "any issue". */
  labels: string[];
  labelMatch: LabelMatch;
}

export interface MatchableEvent {
  type: IssueEventType;
  /** The added label (`issue.labeled` only). */
  label: string | null;
  issue: { labels: IssueLabel[] };
  /** Whether the issue has an open linked PR; only known for events that needed checking. */
  hasOpenPr?: boolean;
}

const normalize = (label: string) => label.trim().toLowerCase();

const requiresNoOpenPr = (labels: string[]) =>
  labels.some((label) => normalize(label) === HAS_NO_OPEN_PR);

/**
 * Whether an event should be delivered to a subscription. Labels are compared case-insensitively.
 *
 * - `issue.opened`: the new issue's labels satisfy the filter (`any`: at least one, `all`: every one).
 * - `issue.labeled`: the added label is one of the subscription's labels, and with `all`
 *   the issue now has every one of them (so the notification fires when the set is completed).
 * - With `HAS_NO_OPEN_PR`, the issue must also be known to have no open PR.
 */
export function matchesSubscription(
  subscription: SubscriptionFilter,
  event: MatchableEvent,
): boolean {
  if (!matchesLabels(subscription, event)) return false;
  return !requiresNoOpenPr(subscription.labels) || event.hasOpenPr === false;
}

/**
 * Whether matching this event depends on its open PRs, which are looked up from GitHub. False when
 * the labels already rule the event out, so that no request is spent on it.
 */
export function needsOpenPrCheck(subscription: SubscriptionFilter, event: MatchableEvent): boolean {
  return requiresNoOpenPr(subscription.labels) && matchesLabels(subscription, event);
}

function matchesLabels(subscription: SubscriptionFilter, event: MatchableEvent): boolean {
  if (!subscription.eventTypes.includes(event.type)) return false;

  const wanted = subscription.labels.map(normalize).filter((label) => label !== HAS_NO_OPEN_PR);
  if (wanted.length === 0) return true;

  const issueLabels = new Set(event.issue.labels.map((label) => normalize(label.name)));
  const hasAllWanted = wanted.every((label) => issueLabels.has(label));

  if (event.type === "issue.labeled") {
    if (event.label === null || !wanted.includes(normalize(event.label))) return false;
    return subscription.labelMatch === "all" ? hasAllWanted : true;
  }

  return subscription.labelMatch === "all"
    ? hasAllWanted
    : wanted.some((label) => issueLabels.has(label));
}
