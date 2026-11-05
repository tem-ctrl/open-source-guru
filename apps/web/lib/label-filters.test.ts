import { describe, expect, it } from "vitest";
import { describeIssues, HAS_NO_OPEN_PR, labelDisplayName, realLabels } from "./label-filters";

describe("label filters", () => {
  it("shows the condition by name and real labels as they are", () => {
    expect(labelDisplayName(HAS_NO_OPEN_PR)).toBe("has no open pr");
    expect(labelDisplayName("HAS_NO_OPEN_PR")).toBe("has no open pr");
    expect(labelDisplayName("bug")).toBe("bug");
  });

  it("leaves the condition out of the real labels", () => {
    expect(realLabels(new Set(["bug", HAS_NO_OPEN_PR]))).toEqual(["bug"]);
  });

  it("describes labels, the condition, or both", () => {
    expect(describeIssues(["bug", "docs"])).toBe("labeled bug, docs");
    expect(describeIssues([HAS_NO_OPEN_PR])).toBe("with no open PR");
    expect(describeIssues(["bug", HAS_NO_OPEN_PR])).toBe("labeled bug with no open PR");
  });
});
