import { MemoryCache } from "./memory-cache.ts";
import type { ListProductsQuery } from "../validators/product.validator.ts";

export const cache = new MemoryCache();

export const CACHE_TTL_MS = Number(process.env.CACHE_TTL_MS ?? 60_000);

const versions = new Map<string, number>();

export function currentVersion(namespace: string): number {
  return versions.get(namespace) ?? 0;
}

export function bumpVersion(namespace: string): number {
  const next = currentVersion(namespace) + 1;
  versions.set(namespace, next);
  return next;
}

export async function cached<T>(
  namespace: string,
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const versionedKey = `${namespace}:v${currentVersion(namespace)}:${key}`;
  const hit = cache.get<T>(versionedKey);

  if (hit !== undefined) {
    return hit;
  }

  const value = await loader();
  cache.set(versionedKey, value, ttlMs);

  return value;
}

export function productListKey(query: ListProductsQuery): string {
  return `list:${query.page}:${query.limit}:${query.category ?? ""}:${query.search ?? ""}`;
}

export function productSlugKey(slug: string): string {
  return `slug:${slug}`;
}

export function invalidateProducts(): void {
  bumpVersion("products");
}

export function invalidateCategories(): void {
  bumpVersion("categories");
}
