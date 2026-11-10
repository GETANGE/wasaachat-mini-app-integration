import { and, count, desc, eq, inArray, like, lte, ne, sql } from "drizzle-orm";
import { db } from "../config/db.ts";
import { productImages, products } from "../models/schema.ts";
import type { Executor, Transaction } from "./types.ts";

export type ProductUpdate = Partial<typeof products.$inferInsert>;
export type ProductImageInsert = typeof productImages.$inferInsert;

export async function findById(id: number, client: Executor = db) {
  const [product] = await client
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  return product;
}

export async function findActiveBySlug(slug: string) {
  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.active, true)))
    .limit(1);

  return product;
}

export async function findIdBySlug(slug: string, excludeId?: number) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      excludeId
        ? and(eq(products.slug, slug), ne(products.id, excludeId))
        : eq(products.slug, slug),
    )
    .limit(1);

  return product;
}

export async function list(input: {
  categoryId?: number;
  search?: string;
  limit: number;
  offset: number;
}) {
  const conditions = [eq(products.active, true)];

  if (input.categoryId !== undefined) {
    conditions.push(eq(products.categoryId, input.categoryId));
  }

  if (input.search) {
    conditions.push(like(products.name, `%${input.search}%`));
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ value: count() })
    .from(products)
    .where(where);

  const rows = await db
    .select()
    .from(products)
    .where(where)
    .orderBy(desc(products.createdAt))
    .limit(input.limit)
    .offset(input.offset);

  return { rows, total: Number(totalRow?.value ?? 0) };
}

export async function findImages(productIds: number[]) {
  if (productIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(productImages.sortOrder);
}

export async function findLowStock(productIds: number[], threshold: number) {
  if (productIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      stock: products.stock,
    })
    .from(products)
    .where(
      and(
        inArray(products.id, productIds),
        lte(products.stock, threshold),
      ),
    );
}

export async function insertProduct(values: typeof products.$inferInsert) {
  const [created] = await db.insert(products).values(values).$returningId();
  return created!.id;
}

export async function updateProduct(
  id: number,
  updates: ProductUpdate,
) {
  await db.update(products).set(updates).where(eq(products.id, id));
}

export async function insertImages(rows: ProductImageInsert[]) {
  if (rows.length > 0) {
    await db.insert(productImages).values(rows);
  }
}

export async function deleteImages(productId: number) {
  await db.delete(productImages).where(eq(productImages.productId, productId));
}

export async function findByIdsForUpdate(
  client: Transaction,
  ids: number[],
) {
  return client
    .select()
    .from(products)
    .where(inArray(products.id, ids))
    .for("update");
}

export async function decrementStock(
  client: Transaction,
  productId: number,
  quantity: number,
) {
  await client
    .update(products)
    .set({ stock: sql`${products.stock} - ${quantity}` })
    .where(eq(products.id, productId));
}

export async function incrementStock(
  client: Transaction,
  productId: number,
  quantity: number,
) {
  await client
    .update(products)
    .set({ stock: sql`${products.stock} + ${quantity}` })
    .where(eq(products.id, productId));
}
