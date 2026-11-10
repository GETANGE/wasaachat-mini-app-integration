import type { Request, Response } from "express";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../services/category.service.ts";
import { parseId } from "../utils/parse.ts";

export async function index(_req: Request, res: Response) {
  const categories = await listCategories();
  res.json({ categories });
}

export async function create(req: Request, res: Response) {
  const category = await createCategory(req.body);
  res.status(201).json({ category });
}

export async function update(req: Request, res: Response) {
  const category = await updateCategory(parseId(req.params.id), req.body);
  res.json({ category });
}

export async function remove(req: Request, res: Response) {
  const result = await deleteCategory(parseId(req.params.id));
  res.json(result);
}
