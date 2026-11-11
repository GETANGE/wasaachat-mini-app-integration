import { afterAll, afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import app from "../../src/app.ts";
import {
  checkIdToken,
  redeemCode,
  safeReturnTo,
  startSignIn,
} from "../../src/services/wasaachat-oauth.service.ts";
import { seal, unseal } from "../../src/utils/sealed.ts";

const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  calls = [];
  process.env.JWT_SECRET = "test-secret";
  process.env.WASAA_BASE = "https://api.example.test/core";
  process.env.WASAACHAT_CLIENT_ID = "app-123";
  process.env.WASAACHAT_CODE_2_SESSION = "secret-xyz";
  process.env.WASAA_OAUTH_REDIRECT_URI = "http://localhost:3000/auth/wasaachat/callback";
  delete process.env.WASAA_OAUTH_AUTHORIZE_URL;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

const idToken = (claims: Record<string, unknown>) =>
  `e30.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

describe("consent redirect", () => {
  test("builds the documented consent URL with PKCE S256", () => {
    const { url, cookie } = startSignIn("/wasaa/");
    const u = new URL(url);
    const pending = unseal<{ state: string; verifier: string; nonce: string }>(cookie)!;

    expect(u.origin + u.pathname).toBe("https://wasaachat.com/oauth/consent");
    expect(u.searchParams.get("client_id")).toBe("app-123");
    expect(u.searchParams.get("redirect_uri")).toBe("http://localhost:3000/auth/wasaachat/callback");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toBe("openid profile");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("state")).toBe(pending.state);
    expect(u.searchParams.get("nonce")).toBe(pending.nonce);
    expect(u.searchParams.get("code_challenge")).toBe(createHash("sha256").update(pending.verifier).digest("base64url"));
    expect(pending.verifier).toMatch(/^[A-Za-z0-9\-._~]{43,128}$/);
  });

  test("state cookie can't be read, edited or reused after expiry", () => {
    const sealed = seal({ state: "s" }, 60);
    expect(sealed).not.toContain("state");
    expect(unseal(sealed)).toMatchObject({ state: "s" });
    const tampered = sealed.slice(0, -2) + (sealed.endsWith("A") ? "B" : "A") + sealed.slice(-1);
    expect(unseal(tampered)).toBeNull();
    expect(unseal(seal({ state: "s" }, -1))).toBeNull();
  });

  test("only returns people to shop pages", () => {
    expect(safeReturnTo("/wasaa/")).toBe("/wasaa/");
    expect(safeReturnTo("/wasaa/?x=1")).toBe("/wasaa/?x=1");
    expect(safeReturnTo("https://evil.example")).toBe("/wasaa/");
    expect(safeReturnTo("//evil.example/wasaa/")).toBe("/wasaa/");
    expect(safeReturnTo(undefined)).toBe("/wasaa/");
  });
});

describe("code exchange", () => {
  test("posts code, verifier and redirect_uri with client credentials", async () => {
    globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ access_token: "wca", token_type: "Bearer", expires_in: 3600, scope: "openid profile", id_token: "x" }), { status: 200 });
    }) as typeof fetch;

    await redeemCode("code-1", "v".repeat(64));

    expect(calls[0]!.url).toBe("https://api.example.test/core/identity/oauth/token");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("app-123:secret-xyz").toString("base64")}`);
    const body = new URLSearchParams(String(calls[0]!.init.body));
    expect(Object.fromEntries(body)).toEqual({
      grant_type: "authorization_code",
      code: "code-1",
      code_verifier: "v".repeat(64),
      redirect_uri: "http://localhost:3000/auth/wasaachat/callback",
    });
  });

  test("ID token: accepts matching iss/aud/nonce, rejects anything else", () => {
    const good = { iss: "https://api.example.test/core/identity/oauth", aud: "app-123", exp: Math.floor(Date.now() / 1000) + 300, nonce: "n1", sub: "user-1" };
    expect(checkIdToken(idToken(good), "n1")).toBe("user-1");
    expect(() => checkIdToken(idToken(good), "other-nonce")).toThrow();
    expect(() => checkIdToken(idToken({ ...good, aud: "another-app" }), "n1")).toThrow();
    expect(() => checkIdToken(idToken({ ...good, iss: "https://evil" }), "n1")).toThrow();
    expect(() => checkIdToken(idToken({ ...good, exp: 1 }), "n1")).toThrow();
    expect(() => checkIdToken(undefined, "n1")).toThrow();
  });
});

describe("routes", () => {
  const server = app.listen(0);
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  afterAll(() => server.close());

  test("GET /auth/wasaachat redirects to consent and sets a short-lived state cookie", async () => {
    const res = await fetch(`${base}/auth/wasaachat?returnTo=/wasaa/`, { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toStartWith("https://wasaachat.com/oauth/consent?");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("wc_oauth=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Max-Age=600");
  });

  test("callback without the state cookie is refused", async () => {
    const res = await fetch(`${base}/auth/wasaachat/callback?code=c&state=s`, { redirect: "manual" });
    expect(res.headers.get("location")).toBe("/wasaa/?signin=expired");
  });

  test("callback with a mismatched state is refused", async () => {
    const start = await fetch(`${base}/auth/wasaachat`, { redirect: "manual" });
    const cookie = (start.headers.get("set-cookie") ?? "").split(";")[0]!;
    const res = await fetch(`${base}/auth/wasaachat/callback?code=c&state=wrong`, { redirect: "manual", headers: { cookie } });
    expect(res.headers.get("location")).toBe("/wasaa/?signin=failed");
  });

  test("declining on the consent screen comes back as declined", async () => {
    const start = await fetch(`${base}/auth/wasaachat`, { redirect: "manual" });
    const cookie = (start.headers.get("set-cookie") ?? "").split(";")[0]!;
    const state = new URL(start.headers.get("location")!).searchParams.get("state");
    const res = await fetch(`${base}/auth/wasaachat/callback?error=access_denied&state=${state}`, { redirect: "manual", headers: { cookie } });
    expect(res.headers.get("location")).toBe("/wasaa/?signin=declined");
  });

  test("logout clears the session cookie", async () => {
    const res = await fetch(`${base}/api/wasaa/logout`, { method: "POST" });
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toContain("viva_session=;");
  });
});
