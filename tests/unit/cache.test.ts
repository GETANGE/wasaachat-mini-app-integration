import { describe, expect, test } from "bun:test";
import { MemoryCache } from "../../src/cache/memory-cache.ts";
import { bumpVersion, cached } from "../../src/cache/index.ts";

describe("MemoryCache", () => {
  test("expires entries after the ttl", async () => {
    const local = new MemoryCache();
    local.set("key", { value: 1 }, 10);

    expect(local.get<{ value: number }>("key")).toEqual({ value: 1 });

    await Bun.sleep(20);

    expect(local.get("key")).toBeUndefined();
  });

  test("evicts the oldest entries past maxEntries", () => {
    const local = new MemoryCache(2);
    local.set("a", 1, 1000);
    local.set("b", 2, 1000);
    local.set("c", 3, 1000);

    expect(local.size).toBe(2);
    expect(local.get("a")).toBeUndefined();
    expect(local.get("c")).toBe(3);
  });
});

describe("versioned cache", () => {
  test("serves cached values until the namespace version is bumped", async () => {
    const namespace = `test:${crypto.randomUUID()}`;
    let loads = 0;
    const loader = async () => {
      loads += 1;
      return loads;
    };

    expect(await cached(namespace, "key", 1000, loader)).toBe(1);
    expect(await cached(namespace, "key", 1000, loader)).toBe(1);
    expect(loads).toBe(1);

    bumpVersion(namespace);

    expect(await cached(namespace, "key", 1000, loader)).toBe(2);
    expect(loads).toBe(2);
  });

  test("namespaces version independently", async () => {
    const products = `products:${crypto.randomUUID()}`;
    const categories = `categories:${crypto.randomUUID()}`;
    let productLoads = 0;
    let categoryLoads = 0;

    await cached(products, "key", 1000, async () => ++productLoads);
    await cached(categories, "key", 1000, async () => ++categoryLoads);

    bumpVersion(products);

    expect(await cached(products, "key", 1000, async () => ++productLoads)).toBe(2);
    expect(await cached(categories, "key", 1000, async () => ++categoryLoads)).toBe(1);
  });
});
