import { afterAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import app from "../../src/app.ts";

const server = app.listen(0);
const { port } = server.address() as AddressInfo;
afterAll(() => server.close());

describe("trust proxy", () => {
  test("is set to one hop so req.ip comes from X-Forwarded-For", () => {
    expect(app.get("trust proxy")).toBe(1);
  });

  test("rate limit is counted per visitor, not per proxy", async () => {
    // Two visitors behind the same proxy get separate allowances.
    const hit = (ip: string) =>
      fetch(`http://localhost:${port}/api/wasaa/logout`, { method: "POST", headers: { "X-Forwarded-For": ip } });
    const a = await hit("203.0.113.10");
    const b = await hit("198.51.100.20");
    const remainingA = Number(a.headers.get("ratelimit")?.match(/r=(\d+)/)?.[1]);
    const remainingB = Number(b.headers.get("ratelimit")?.match(/r=(\d+)/)?.[1]);
    expect(remainingA).toBe(remainingB);
  });
});
