import { describe, expect, it } from "vitest";
import {
  HAS_NO_OPEN_PR,
  type MatchableEvent,
  matchesSubscription,
  needsOpenPrCheck,
  type SubscriptionFilter,
} from "./match.ts";

const label = (name: string) => ({ nodeId: `LA_${name}`, name, color: "ffffff" });

const opened = (...labels: string[]): MatchableEvent => ({
  type: "issue.opened",
  label: null,
  issue: { labels: labels.map(label) },
});

const labeled = (added: string, ...labels: string[]): MatchableEvent => ({
  type: "issue.labeled",
  label: added,
  issue: { labels: [added, ...labels].map(label) },
});

const sub = (overrides: Partial<SubscriptionFilter> = {}): SubscriptionFilter => ({
  eventTypes: ["issue.opened", "issue.labeled"],
  labels: ["help wanted"],
  labelMatch: "any",
  ...overrides,
});

describe("matchesSubscription", () => {
  it("ignores event types the subscription didn't ask for", () => {
    expect(matchesSubscription(sub({ eventTypes: ["issue.labeled"] }), opened("help wanted"))).toBe(
      false,
    );
  });

  it("matches label names case-insensitively", () => {
    expect(matchesSubscription(sub(), opened("Help Wanted"))).toBe(true);
    expect(matchesSubscription(sub({ labels: ["HELP WANTED "] }), labeled("help wanted"))).toBe(
      true,
    );
  });

  it("matches any issue when the subscription has no labels", () => {
    expect(matchesSubscription(sub({ labels: [] }), opened())).toBe(true);
  });

  describe("issue.opened", () => {
    it("with 'any', needs at least one of the labels", () => {
      const filter = sub({ labels: ["help wanted", "good first issue"] });
      expect(matchesSubscription(filter, opened("good first issue", "bug"))).toBe(true);
      expect(matchesSubscription(filter, opened("bug"))).toBe(false);
    });

    it("with 'all', needs every label", () => {
      const filter = sub({ labels: ["help wanted", "good first issue"], labelMatch: "all" });
      expect(matchesSubscription(filter, opened("help wanted", "good first issue"))).toBe(true);
      expect(matchesSubscription(filter, opened("help wanted"))).toBe(false);
    });
  });

  describe("issue.labeled", () => {
    it("matches only when the added label is one of the subscription's labels", () => {
      expect(matchesSubscription(sub(), labeled("help wanted", "bug"))).toBe(true);
      expect(matchesSubscription(sub(), labeled("bug", "help wanted"))).toBe(false);
    });

    it("with 'all', matches when the added label completes the set", () => {
      const filter = sub({ labels: ["help wanted", "good first issue"], labelMatch: "all" });
      expect(matchesSubscription(filter, labeled("help wanted", "good first issue"))).toBe(true);
      expect(matchesSubscription(filter, labeled("help wanted"))).toBe(false);
    });
  });

  describe("has_no_open_pr", () => {
    const withoutPr = (event: MatchableEvent) => ({ ...event, hasOpenPr: false });
    const withPr = (event: MatchableEvent) => ({ ...event, hasOpenPr: true });

    it("alone, matches any issue without an open PR", () => {
      const filter = sub({ labels: [HAS_NO_OPEN_PR] });
      expect(matchesSubscription(filter, withoutPr(opened("bug")))).toBe(true);
      expect(matchesSubscription(filter, withPr(opened("bug")))).toBe(false);
    });

    it("never matches while the open PRs are unknown", () => {
      expect(matchesSubscription(sub({ labels: [HAS_NO_OPEN_PR] }), opened())).toBe(false);
    });

    it("is required on top of the labels with 'any'", () => {
      const filter = sub({ labels: ["help wanted", "bug", HAS_NO_OPEN_PR] });
      expect(matchesSubscription(filter, withoutPr(opened("bug")))).toBe(true);
      expect(matchesSubscription(filter, withPr(opened("bug")))).toBe(false);
      expect(matchesSubscription(filter, withoutPr(opened("docs")))).toBe(false);
    });

    it("isn't counted as a label to have with 'all'", () => {
      const filter = sub({ labels: ["help wanted", "bug", HAS_NO_OPEN_PR], labelMatch: "all" });
      expect(matchesSubscription(filter, withoutPr(opened("help wanted", "bug")))).toBe(true);
      expect(matchesSubscription(filter, withoutPr(opened("help wanted")))).toBe(false);
    });

    it("applies to labels added to existing issues", () => {
      const filter = sub({ labels: ["help wanted", HAS_NO_OPEN_PR] });
      expect(matchesSubscription(filter, withoutPr(labeled("help wanted")))).toBe(true);
      expect(matchesSubscription(filter, withPr(labeled("help wanted")))).toBe(false);
    });

    it("is recognized regardless of case", () => {
      const filter = sub({ labels: ["HAS_NO_OPEN_PR "] });
      expect(matchesSubscription(filter, withPr(opened()))).toBe(false);
    });
  });

  describe("needsOpenPrCheck", () => {
    it("is true only when the labels already match", () => {
      const filter = sub({ labels: ["help wanted", HAS_NO_OPEN_PR] });
      expect(needsOpenPrCheck(filter, opened("help wanted"))).toBe(true);
      expect(needsOpenPrCheck(filter, opened("bug"))).toBe(false);
    });

    it("is false for subscriptions without the condition", () => {
      expect(needsOpenPrCheck(sub(), opened("help wanted"))).toBe(false);
    });

    it("is false for event types the subscription didn't ask for", () => {
      const filter = sub({ labels: [HAS_NO_OPEN_PR], eventTypes: ["issue.labeled"] });
      expect(needsOpenPrCheck(filter, opened())).toBe(false);
    });
  });
});
