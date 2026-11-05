import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { serializeRequest } from "./logging.ts";

describe("serializeRequest", () => {
  it("keeps the query string out of request logs", async () => {
    const lines: string[] = [];
    const app = Fastify({
      logger: {
        serializers: { req: serializeRequest },
        stream: { write: (line: string) => lines.push(line) },
      },
    });
    app.get("/unsubscribe", async () => ({ ok: true }));

    await app.inject({ method: "GET", url: "/unsubscribe?token=secret-token" });
    await app.close();

    const logs = lines.join("");
    expect(logs).not.toContain("secret-token");
    expect(logs).toContain('"url":"/unsubscribe"');
    expect(logs).toContain('"method":"GET"');
  });
});
