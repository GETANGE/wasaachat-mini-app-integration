import type { Request, Response } from "express";
import {
  addCartItem,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../services/cart.service.ts";
import { parseId } from "../utils/parse.ts";

export async function show(req: Request, res: Response) {
  const cart = await getCart(req.user!.id);
  res.json({ cart });
}

export async function addItem(req: Request, res: Response) {
  const cart = await addCartItem(
    req.user!.id,
    req.body.productId,
    req.body.quantity,
  );
  res.status(201).json({ cart });
}

export async function updateItem(req: Request, res: Response) {
  const cart = await updateCartItem(
    req.user!.id,
    parseId(req.params.productId),
    req.body.quantity,
  );
  res.json({ cart });
}

export async function removeItem(req: Request, res: Response) {
  const cart = await removeCartItem(
    req.user!.id,
    parseId(req.params.productId),
  );
  res.json({ cart });
}
