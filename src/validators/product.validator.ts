import { z } from "zod";

const imageSchema = z.object({
  url: z.url().max(500),
  alt: z.string().trim().max(200).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

const productFields = {
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(220).optional(),
  description: z.string().trim().max(5000).optional(),
  price: z.coerce.number().positive().max(99999999.99),
  stock: z.number().int().min(0),
  sku: z.string().trim().min(1).max(64),
  active: z.boolean(),
  images: z.array(imageSchema).max(20).optional(),
};

export const createProductSchema = z.object({
  ...productFields,
  stock: productFields.stock.default(0),
  active: productFields.active.default(true),
});

export const updateProductSchema = z.object(productFields).partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().min(1).max(140).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
