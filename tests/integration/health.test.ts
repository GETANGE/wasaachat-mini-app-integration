import { afterAll, describe, expect, test } from "bun:test";
import type { AddressInfo } from "node:net";
import app from "../../src/app.ts";

const server = app.listen(0);
const { port } = server.address() as AddressInfo;

afterAll(() => server.close());

describe("health", () => {
  test("GET /health returns ok", async () => {
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
