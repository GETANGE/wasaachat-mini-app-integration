import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { verifyWasaSignature } from "../../src/services/wasaachat.service.ts";

const SECRET = "whsec_test_secret";
const BODY = '{"event":"webhook.test"}';
const TIMESTAMP = 1761818651;
const HEADER =
  "t=1761818651,v1=e7f2e8c58983c5fd4f37e1f6f5adeb985575d244a011ca2c71e5e97b9f822868";

function sign(body: string, timestamp: number, secret = SECRET): string {
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return `t=${timestamp},v1=${digest}`;
}

describe("WasaaChat webhook signatures", () => {
  test("accepts the documented test vector", () => {
    expect(verifyWasaSignature(BODY, HEADER, SECRET, 10 ** 12)).toBe(true);
  });

  test("accepts a freshly signed body", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWasaSignature(BODY, sign(BODY, now), SECRET)).toBe(true);
  });

  test("rejects a tampered body", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(
      verifyWasaSignature(
        '{"event":"payment_intent.paid"}',
        sign(BODY, now),
        SECRET,
      ),
    ).toBe(false);
  });

  test("rejects the wrong secret", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWasaSignature(BODY, sign(BODY, now), "whsec_other")).toBe(
      false,
    );
  });

  test("rejects stale timestamps", () => {
    const old = Math.floor(Date.now() / 1000) - 1000;
    expect(verifyWasaSignature(BODY, sign(BODY, old), SECRET)).toBe(false);
  });

  test("rejects missing or malformed headers", () => {
    expect(verifyWasaSignature(BODY, undefined, SECRET)).toBe(false);
    expect(verifyWasaSignature(BODY, "garbage", SECRET)).toBe(false);
  });
});
