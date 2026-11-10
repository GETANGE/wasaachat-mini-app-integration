import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { exchangeLaunchCode, fetchBridgeDisplayName } from "../../src/services/wasaachat.service.ts";
import { issueSession } from "../../src/services/session.service.ts";
import { verifyToken } from "../../src/utils/token.ts";

const realFetch = globalThis.fetch;
let calls: { url: string; init: RequestInit }[] = [];

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = (async (url: string | URL, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.WASAA_BASE = "https://api.example.test/core";
  process.env.WASAA_APP_ID = "app-123";
  process.env.WASAA_APP_SECRET = "secret-xyz";
  process.env.JWT_SECRET = "test-secret";
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("Launch codes (code2Session)", () => {
  test("exchanges the code with app_id and app_secret as documented", async () => {
    mockFetch(200, { open_user_id: "4d2c8a7e", granted_scopes: ["wallet.pay"], session_token: "st", expires_in: 3600 });

    const session = await exchangeLaunchCode("launch-1");

    expect(session.open_user_id).toBe("4d2c8a7e");
    expect(calls[0]!.url).toBe("https://api.example.test/core/marketplace/bridge/session");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ app_id: "app-123", app_secret: "secret-xyz", code: "launch-1" });
  });

  test("rejects an invalid, used or expired code", async () => {
    mockFetch(401, { code: "APP_LAUNCH_TOKEN_INVALID" });
    await expect(exchangeLaunchCode("used")).rejects.toThrow("reopen the app");
  });
});

describe("Bridge profile", () => {
  test("reads the display name with the session token", async () => {
    mockFetch(200, { open_user_id: "4d2c8a7e", display_name: "Amina W.", avatar_url: null });
    expect(await fetchBridgeDisplayName("st")).toBe("Amina W.");
    expect(calls[0]!.url).toBe("https://api.example.test/core/marketplace/bridge/profile");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer st");
  });

  test("returns null instead of failing sign-in", async () => {
    mockFetch(403, { code: "APP_SCOPE_NOT_GRANTED" });
    expect(await fetchBridgeDisplayName("st")).toBeNull();
  });
});

describe("Shop session", () => {
  test("ends when the bridge session ends, never later than one hour", () => {
    const user = { id: 7, role: "customer" as const };
    expect(issueSession(user, 1800).expiresIn).toBe(1800);
    expect(issueSession(user, 999_999).expiresIn).toBe(3600);
    const { accessToken } = issueSession(user, 3600);
    expect(verifyToken(accessToken)).toEqual({ uid: 7, role: "customer" });
  });
});
