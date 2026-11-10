import { describe, expect, test } from "bun:test";
import { slugify } from "../../src/utils/slug.ts";

describe("slugify", () => {
  test("normalizes text into a slug", () => {
    expect(slugify("Hello World!")).toBe("hello-world");
    expect(slugify("  Blue  Cotton T-Shirt  ")).toBe("blue-cotton-t-shirt");
  });

  test("trims leading and trailing dashes", () => {
    expect(slugify("--Sale--")).toBe("sale");
  });
});
