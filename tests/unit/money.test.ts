import { describe, expect, test } from "bun:test";
import { fromCents, shippingFor, toCents } from "../../src/utils/money.ts";

describe("money", () => {
  test("converts decimal strings to cents", () => {
    expect(toCents("19.99")).toBe(1999);
    expect(toCents("0.10")).toBe(10);
  });

  test("formats cents as decimal strings", () => {
    expect(fromCents(1999)).toBe("19.99");
    expect(fromCents(5)).toBe("0.05");
  });

  test("applies free shipping threshold", () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(4999)).toBe(500);
    expect(shippingFor(5000)).toBe(0);
  });
});
