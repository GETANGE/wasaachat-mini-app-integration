import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { createHmac } from "node:crypto";
import type { AddressInfo } from "node:net";

// Stand-in for the users table.
const revocations = new Map<number, Date>();
const revokeCalls: { sub: string; at: Date }[] = [];
mock.module("../../src/repositories/user.repository.ts", () => ({
  findWebSessionsRevokedAt: async (id: number) => revocations.get(id) ?? null,
  revokeWebSessions: async (sub: string, at: Date) => {
    revokeCalls.push({ sub, at });
    return true;
  },
  findPublicById: async (id: number) => ({ id, name: "Amina", role: "customer", email: null, emailVerified: false, createdAt: new Date() }),
  findByWasaaOpenUserId: async () => undefined,
  createWasaaUser: async () => 1,
  updateName: async () => undefined,
}));

const { verifyDeauthorizeSignature, handleDeauthorize } = await import("../../src/services/wasaachat-deauthorize.service.ts");
const { signToken } = await import("../../src/utils/token.ts");
const { default: app } = await import("../../src/app.ts");

const SECRET = "whsec_test";
const sign = (ts: string, body: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;
const now = () => String(Math.floor(Date.now() / 1000));
const event = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ event: "app.deauthorized", sub: "2b9d6f0e", client_id: "app-123", occurred_at: "2026-10-30T09:12:44.120Z", ...over });

beforeEach(() => {
  revokeCalls.length = 0;
  revocations.clear();
  process.env.JWT_SECRET = "test-secret";
  process.env.WASAACHAT_CLIENT_ID = "app-123";
  process.env.WASAACHAT_PAYOUT_DEAUTHORIZE_SECRET = SECRET;
});

describe("deauthorize signature", () => {
  test("accepts the documented format, rejects tampering, wrong secret and stale timestamps", () => {
    const ts = now();
    const body = event();
    expect(verifyDeauthorizeSignature(body, ts, sign(ts, body), SECRET)).toBe(true);
    expect(verifyDeauthorizeSignature(body + " ", ts, sign(ts, body), SECRET)).toBe(false);
    expect(verifyDeauthorizeSignature(body, ts, sign(ts, body, "other"), SECRET)).toBe(false);
    const old = String(Number(ts) - 600);
    expect(verifyDeauthorizeSignature(body, old, sign(old, body), SECRET)).toBe(false);
    expect(verifyDeauthorizeSignature(body, undefined, sign(ts, body), SECRET)).toBe(false);
  });
});

describe("deauthorize handler", () => {
  test("records the disconnect for that WasaaChat user", async () => {
    const ts = now();
    const body = event();
    await handleDeauthorize({ rawBody: body, timestamp: ts, signature: sign(ts, body) });
    expect(revokeCalls).toEqual([{ sub: "2b9d6f0e", at: new Date("2026-10-30T09:12:44.120Z") }]);
  });

  test("ignores events for another app and malformed events", async () => {
    const ts = now();
    for (const body of [event({ client_id: "another-app" }), event({ event: "something.else" }), event({ sub: "" })]) {
      await expect(handleDeauthorize({ rawBody: body, timestamp: ts, signature: sign(ts, body) })).rejects.toThrow();
    }
    expect(revokeCalls).toHaveLength(0);
  });
});

describe("routes and sessions", () => {
  const server = app.listen(0);
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  afterAll(() => server.close());

  test("POST /api/wasaa/deauthorize: 401 on a bad signature, 204 on a good one", async () => {
    const body = event();
    const ts = now();
    const bad = await fetch(`${base}/api/wasaa/deauthorize`, { method: "POST", headers: { "content-type": "application/json", "X-Wasaa-Timestamp": ts, "X-Wasaa-Signature": "sha256=00" }, body });
    expect(bad.status).toBe(401);
    const good = await fetch(`${base}/api/wasaa/deauthorize`, { method: "POST", headers: { "content-type": "application/json", "X-Wasaa-Timestamp": ts, "X-Wasaa-Signature": sign(ts, body), "X-Wasaa-Delivery": "d-1" }, body });
    expect(good.status).toBe(204);
  });

  test("a web session issued before the disconnect is rejected; in-app sessions are not affected", async () => {
    const web = signToken({ uid: 5, role: "customer", kind: "web" }, 3600);
    const appToken = signToken({ uid: 5, role: "customer", kind: "app" }, 3600);

    const before = await fetch(`${base}/api/wasaa/me`, { headers: { cookie: `viva_session=${web}` } });
    expect(before.status).toBe(200);

    revocations.set(5, new Date(Date.now() + 1000)); // disconnected after the token was issued
    const after = await fetch(`${base}/api/wasaa/me`, { headers: { cookie: `viva_session=${web}` } });
    expect(after.status).toBe(401);

    const inApp = await fetch(`${base}/api/wasaa/me`, { headers: { authorization: `Bearer ${appToken}` } });
    expect(inApp.status).toBe(200);
  });
});
