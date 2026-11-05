import { Octokit } from "@octokit/rest";
import { HttpResponse, http } from "msw/http";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createGitHubApi, RepositoryNotFoundError, toGitHubIssue } from "./api.ts";

const BASE = "https://api.github.test";
const server = setupServer();
const api = createGitHubApi(new Octokit({ baseUrl: BASE, auth: "test-token" }));

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const rawIssue = (number: number, extra: Record<string, unknown> = {}) => ({
  id: 1000 + number,
  number,
  title: `Issue ${number}`,
  html_url: `https://github.com/acme/repo/issues/${number}`,
  state: "open",
  labels: [{ node_id: "LA_1", name: "help wanted", color: "008672" }],
  assignees: [{ login: "alice" }],
  user: { login: "octocat" },
  created_at: "2026-10-10T10:00:00Z",
  updated_at: "2026-10-10T12:00:00Z",
  ...extra,
});

describe("toGitHubIssue", () => {
  it("normalizes an issue and skips pull requests", () => {
    expect(toGitHubIssue(rawIssue(1))).toMatchObject({
      githubId: 1001,
      number: 1,
      labels: [{ nodeId: "LA_1", name: "help wanted", color: "008672" }],
      assignees: ["alice"],
      authorLogin: "octocat",
      createdAt: new Date("2026-10-10T10:00:00Z"),
    });
    expect(toGitHubIssue(rawIssue(2, { pull_request: { url: "…" } }))).toBeNull();
  });
});

describe("listIssuesPage", () => {
  it("sends the ETag and since, and reports the next page", async () => {
    let seen: { etag: string | null; url: URL } | undefined;
    server.use(
      http.get(`${BASE}/repos/acme/repo/issues`, ({ request }) => {
        seen = { etag: request.headers.get("if-none-match"), url: new URL(request.url) };
        return HttpResponse.json([rawIssue(1), rawIssue(2, { pull_request: {} })], {
          headers: {
            etag: 'W/"abc"',
            link: `<${BASE}/repos/acme/repo/issues?page=2>; rel="next"`,
          },
        });
      }),
    );

    const page = await api.listIssuesPage({
      owner: "acme",
      name: "repo",
      state: "all",
      since: new Date("2026-10-01T00:00:00Z"),
      page: 1,
      etag: 'W/"old"',
    });

    expect(seen?.etag).toBe('W/"old"');
    expect(seen?.url.searchParams.get("since")).toBe("2026-10-01T00:00:00.000Z");
    expect(seen?.url.searchParams.get("sort")).toBe("updated");
    expect(page).toMatchObject({ notModified: false, etag: 'W/"abc"', hasNextPage: true });
    expect(page.notModified === false && page.issues.map((issue) => issue.number)).toEqual([1]);
  });

  it("reports 304 Not Modified", async () => {
    server.use(
      http.get(`${BASE}/repos/acme/repo/issues`, () => new HttpResponse(null, { status: 304 })),
    );

    await expect(
      api.listIssuesPage({ owner: "acme", name: "repo", state: "all", page: 1, etag: 'W/"abc"' }),
    ).resolves.toEqual({ notModified: true });
  });

  it("throws RepositoryNotFoundError on 404", async () => {
    server.use(
      http.get(`${BASE}/repos/acme/gone/issues`, () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 }),
      ),
    );

    await expect(
      api.listIssuesPage({ owner: "acme", name: "gone", state: "open", page: 1 }),
    ).rejects.toBeInstanceOf(RepositoryNotFoundError);
  });
});

describe("getRepository", () => {
  it("returns the repository, or null when it doesn't exist", async () => {
    server.use(
      http.get(`${BASE}/repos/acme/repo`, () =>
        HttpResponse.json({
          id: 42,
          name: "repo",
          owner: { login: "acme" },
          private: false,
          has_issues: true,
        }),
      ),
      http.get(`${BASE}/repos/acme/missing`, () =>
        HttpResponse.json({ message: "Not Found" }, { status: 404 }),
      ),
    );

    await expect(api.getRepository("acme", "repo")).resolves.toEqual({
      githubId: 42,
      owner: "acme",
      name: "repo",
      private: false,
      hasIssues: true,
    });
    await expect(api.getRepository("acme", "missing")).resolves.toBeNull();
  });
});

describe("listRepoLabels", () => {
  it("collects every page of labels with open-issue counts", async () => {
    server.use(
      http.post(`${BASE}/graphql`, async ({ request }) => {
        const { variables } = (await request.json()) as { variables: { after: string | null } };
        const first = !variables.after;
        return HttpResponse.json({
          data: {
            repository: {
              labels: {
                pageInfo: { hasNextPage: first, endCursor: first ? "cursor-1" : null },
                nodes: [
                  first
                    ? {
                        id: "LA_1",
                        name: "help wanted",
                        color: "008672",
                        description: null,
                        issues: { totalCount: 37 },
                      }
                    : {
                        id: "LA_2",
                        name: "bug",
                        color: "d73a4a",
                        description: "Broken",
                        issues: { totalCount: 3 },
                      },
                ],
              },
            },
          },
        });
      }),
    );

    await expect(api.listRepoLabels("acme", "repo")).resolves.toEqual([
      { nodeId: "LA_1", name: "help wanted", color: "008672", description: null, openIssues: 37 },
      { nodeId: "LA_2", name: "bug", color: "d73a4a", description: "Broken", openIssues: 3 },
    ]);
  });
});

describe("listIssuesWithOpenPrs", () => {
  const issueWith = (...states: string[]) => ({
    closedByPullRequestsReferences: { nodes: states.map((state) => ({ state })) },
  });

  it("returns the issues with an open PR, ignoring the other states", async () => {
    server.use(
      http.post(`${BASE}/graphql`, () =>
        HttpResponse.json({
          data: {
            repository: {
              i1: issueWith("OPEN", "CLOSED"),
              i2: issueWith("CLOSED", "MERGED"),
              i3: issueWith(),
            },
          },
        }),
      ),
    );
    expect(await api.listIssuesWithOpenPrs("acme", "repo", [1, 2, 3])).toEqual(new Set([1]));
  });

  it("splits many issues over several requests", async () => {
    const batches: number[] = [];
    server.use(
      http.post(`${BASE}/graphql`, async ({ request }) => {
        const { query } = (await request.json()) as { query: string };
        const aliases = [...query.matchAll(/i(\d+): issue\(/g)].map((match) => match[1]);
        batches.push(aliases.length);
        return HttpResponse.json({
          data: {
            repository: Object.fromEntries(aliases.map((n) => [`i${n}`, issueWith("OPEN")])),
          },
        });
      }),
    );
    const numbers = Array.from({ length: 120 }, (_, index) => index + 1);
    const result = await api.listIssuesWithOpenPrs("acme", "repo", numbers);
    expect(batches).toEqual([50, 50, 20]);
    expect(result.size).toBe(120);
  });

  it("keeps the other issues when one no longer exists", async () => {
    server.use(
      http.post(`${BASE}/graphql`, () =>
        HttpResponse.json({
          data: { repository: { i1: issueWith("OPEN"), i2: null } },
          errors: [{ type: "NOT_FOUND", path: ["repository", "i2"], message: "Not found" }],
        }),
      ),
    );
    expect(await api.listIssuesWithOpenPrs("acme", "repo", [1, 2])).toEqual(new Set([1]));
  });

  it("finds nothing in a repository that no longer exists", async () => {
    server.use(
      http.post(`${BASE}/graphql`, () =>
        HttpResponse.json({
          data: { repository: null },
          errors: [{ type: "NOT_FOUND", path: ["repository"], message: "Not found" }],
        }),
      ),
    );
    expect(await api.listIssuesWithOpenPrs("acme", "gone", [1])).toEqual(new Set());
  });

  it("throws on any other error, so that the check is retried", async () => {
    server.use(
      http.post(`${BASE}/graphql`, () =>
        HttpResponse.json({
          data: { repository: null },
          errors: [{ type: "RATE_LIMITED", message: "Slow down" }],
        }),
      ),
    );
    await expect(api.listIssuesWithOpenPrs("acme", "repo", [1])).rejects.toThrow("Slow down");
  });
});
