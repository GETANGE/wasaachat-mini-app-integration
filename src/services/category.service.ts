import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.ts";
import { slugify } from "../utils/slug.ts";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "../validators/category.validator.ts";
import * as categoryRepository from "../repositories/category.repository.ts";
import {
  CACHE_TTL_MS,
  cached,
  invalidateCategories,
} from "../cache/index.ts";

async function findCategoryById(id: number) {
  const category = await categoryRepository.findById(id);

  if (!category) {
    throw new NotFoundError("Category not found");
  }

  return category;
}

async function ensureSlugFree(slug: string, excludeId?: number) {
  const existing = await categoryRepository.findIdBySlug(slug, excludeId);

  if (existing) {
    throw new ConflictError("Category slug is already in use");
  }
}

export function listCategories() {
  return cached("categories", "list", CACHE_TTL_MS, () =>
    categoryRepository.listCategories(),
  );
}

export async function createCategory(input: CreateCategoryInput) {
  const slug = input.slug ?? slugify(input.name);

  if (!slug) {
    throw new BadRequestError("Unable to derive a slug from the name");
  }

  await ensureSlugFree(slug);

  const id = await categoryRepository.insertCategory({
    name: input.name,
    slug,
    description: input.description ?? null,
  });

  invalidateCategories();

  return findCategoryById(id);
}

export async function updateCategory(id: number, input: UpdateCategoryInput) {
  await findCategoryById(id);

  const updates: categoryRepository.CategoryUpdate = {};

  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;

  if (input.slug !== undefined) {
    await ensureSlugFree(input.slug, id);
    updates.slug = input.slug;
  }

  if (Object.keys(updates).length > 0) {
    await categoryRepository.updateCategory(id, updates);
  }

  invalidateCategories();

  return findCategoryById(id);
}

export async function deleteCategory(id: number) {
  await findCategoryById(id);

  const productCount = await categoryRepository.countProducts(id);

  if (productCount > 0) {
    throw new ConflictError("Category still has products");
  }

  await categoryRepository.removeCategory(id);
  invalidateCategories();

  return { id };
}
