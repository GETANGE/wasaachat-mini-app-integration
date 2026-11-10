import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/errors.ts";
import { slugify } from "../utils/slug.ts";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "../validators/product.validator.ts";
import * as categoryRepository from "../repositories/category.repository.ts";
import * as productRepository from "../repositories/product.repository.ts";
import {
  CACHE_TTL_MS,
  cached,
  invalidateProducts,
  productListKey,
  productSlugKey,
} from "../cache/index.ts";

type ProductImage = Awaited<
  ReturnType<typeof productRepository.findImages>
>[number];

async function imagesByProductId(
  productIds: number[],
): Promise<Map<number, ProductImage[]>> {
  const map = new Map<number, ProductImage[]>();

  if (productIds.length === 0) {
    return map;
  }

  const rows = await productRepository.findImages(productIds);

  for (const image of rows) {
    const list = map.get(image.productId) ?? [];
    list.push(image);
    map.set(image.productId, list);
  }

  return map;
}

async function ensureCategory(categoryId: number) {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new BadRequestError("Category does not exist");
  }
}

async function ensureSlugFree(slug: string, excludeId?: number) {
  const existing = await productRepository.findIdBySlug(slug, excludeId);

  if (existing) {
    throw new ConflictError("Product slug is already in use");
  }
}

export async function getProductById(id: number) {
  const product = await productRepository.findById(id);

  if (!product) {
    throw new NotFoundError("Product not found");
  }

  const images = await imagesByProductId([product.id]);

  return { ...product, images: images.get(product.id) ?? [] };
}

export async function getProductBySlug(slug: string) {
  return cached("products", productSlugKey(slug), CACHE_TTL_MS, async () => {
    const product = await productRepository.findActiveBySlug(slug);

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const images = await imagesByProductId([product.id]);

    return { ...product, images: images.get(product.id) ?? [] };
  });
}

export async function listProducts(query: ListProductsQuery) {
  return cached("products", productListKey(query), CACHE_TTL_MS, async () => {
    let categoryId: number | undefined;

    if (query.category) {
      const category = await categoryRepository.findIdBySlug(query.category);

      if (!category) {
        return {
          items: [],
          page: query.page,
          limit: query.limit,
          total: 0,
          totalPages: 0,
        };
      }

      categoryId = category.id;
    }

    const { rows, total } = await productRepository.list({
      categoryId,
      search: query.search,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
    });

    const images = await imagesByProductId(rows.map((row) => row.id));

    return {
      items: rows.map((product) => ({
        ...product,
        images: images.get(product.id) ?? [],
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  });
}

export async function createProduct(input: CreateProductInput) {
  await ensureCategory(input.categoryId);

  const slug = input.slug ?? slugify(input.name);

  if (!slug) {
    throw new BadRequestError("Unable to derive a slug from the name");
  }

  await ensureSlugFree(slug);

  const id = await productRepository.insertProduct({
    categoryId: input.categoryId,
    name: input.name,
    slug,
    description: input.description ?? null,
    price: input.price.toFixed(2),
    stock: input.stock,
    sku: input.sku,
    active: input.active,
  });

  if (input.images && input.images.length > 0) {
    await productRepository.insertImages(
      input.images.map((image) => ({
        productId: id,
        url: image.url,
        alt: image.alt ?? null,
        sortOrder: image.sortOrder,
      })),
    );
  }

  invalidateProducts();

  return getProductById(id);
}

export async function updateProduct(id: number, input: UpdateProductInput) {
  await getProductById(id);

  if (input.categoryId !== undefined) {
    await ensureCategory(input.categoryId);
  }

  const updates: productRepository.ProductUpdate = {};

  if (input.categoryId !== undefined) updates.categoryId = input.categoryId;
  if (input.name !== undefined) updates.name = input.name;
  if (input.description !== undefined) updates.description = input.description;
  if (input.price !== undefined) updates.price = input.price.toFixed(2);
  if (input.stock !== undefined) updates.stock = input.stock;
  if (input.sku !== undefined) updates.sku = input.sku;
  if (input.active !== undefined) updates.active = input.active;

  if (input.slug !== undefined) {
    await ensureSlugFree(input.slug, id);
    updates.slug = input.slug;
  }

  if (Object.keys(updates).length > 0) {
    await productRepository.updateProduct(id, updates);
  }

  if (input.images !== undefined) {
    await productRepository.deleteImages(id);

    if (input.images.length > 0) {
      await productRepository.insertImages(
        input.images.map((image) => ({
          productId: id,
          url: image.url,
          alt: image.alt ?? null,
          sortOrder: image.sortOrder,
        })),
      );
    }
  }

  invalidateProducts();

  return getProductById(id);
}

export async function deleteProduct(id: number) {
  await getProductById(id);

  await productRepository.updateProduct(id, { active: false });
  invalidateProducts();

  return { id, active: false };
}
