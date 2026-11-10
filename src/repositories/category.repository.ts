import { and, count, eq, ne } from "drizzle-orm";
import { db } from "../config/db.ts";
import { categories, products } from "../models/schema.ts";

export type CategoryUpdate = Partial<typeof categories.$inferInsert>;

export function listCategories() {
  return db.select().from(categories).orderBy(categories.name);
}

export async function findById(id: number) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);

  return category;
}

export async function findIdBySlug(slug: string, excludeId?: number) {
  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      excludeId
        ? and(eq(categories.slug, slug), ne(categories.id, excludeId))
        : eq(categories.slug, slug),
    )
    .limit(1);

  return category;
}

export async function insertCategory(input: {
  name: string;
  slug: string;
  description: string | null;
}) {
  const [created] = await db
    .insert(categories)
    .values(input)
    .$returningId();

  return created!.id;
}

export async function updateCategory(
  id: number,
  updates: CategoryUpdate,
) {
  await db.update(categories).set(updates).where(eq(categories.id, id));
}

export async function countProducts(categoryId: number) {
  const [result] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.categoryId, categoryId));

  return Number(result?.value ?? 0);
}

export async function removeCategory(id: number) {
  await db.delete(categories).where(eq(categories.id, id));
}
