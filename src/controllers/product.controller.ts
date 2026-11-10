import type { Request, Response } from "express";
import {
  createProduct,
  deleteProduct,
  getProductBySlug,
  listProducts,
  updateProduct,
} from "../services/product.service.ts";
import { firstParam, parseId } from "../utils/parse.ts";
import { listProductsQuerySchema } from "../validators/product.validator.ts";

export async function index(req: Request, res: Response) {
  const query = listProductsQuerySchema.parse(req.query);
  const result = await listProducts(query);
  res.json(result);
}

export async function show(req: Request, res: Response) {
  const product = await getProductBySlug(firstParam(req.params.slug));
  res.json({ product });
}

export async function create(req: Request, res: Response) {
  const product = await createProduct(req.body);
  res.status(201).json({ product });
}

export async function update(req: Request, res: Response) {
  const product = await updateProduct(parseId(req.params.id), req.body);
  res.json({ product });
}

export async function remove(req: Request, res: Response) {
  const result = await deleteProduct(parseId(req.params.id));
  res.json(result);
}
