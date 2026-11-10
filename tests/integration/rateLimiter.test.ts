import { afterAll, describe, expect, test } from "bun:test";
import express from "express";
import type { AddressInfo } from "node:net";
import { createRateLimiter } from "../../src/middleware/rateLimiter.ts";

const app = express();
app.get("/limited", createRateLimiter({ limit: 2 }), (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(0);
const { port } = server.address() as AddressInfo;

afterAll(() => server.close());

describe("rate limiter", () => {
  test("allows under the limit then blocks with 429", async () => {
    const first = await fetch(`http://localhost:${port}/limited`);
    const second = await fetch(`http://localhost:${port}/limited`);
    const third = await fetch(`http://localhost:${port}/limited`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({
      error: "Too many requests, please try again later.",
    });
  });
});
