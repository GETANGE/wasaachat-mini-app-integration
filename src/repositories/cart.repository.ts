import { and, eq } from "drizzle-orm";
import { db } from "../config/db.ts";
import { cartItems, carts, products } from "../models/schema.ts";
import type { Executor } from "./types.ts";

export async function findByUserId(userId: number, client: Executor = db) {
  const [cart] = await client
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  return cart;
}

export async function createCart(userId: number) {
  const [created] = await db.insert(carts).values({ userId }).$returningId();
  return created!.id;
}

export async function findItems(cartId: number, client: Executor = db) {
  return client
    .select({
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      name: products.name,
      slug: products.slug,
      price: products.price,
      stock: products.stock,
      active: products.active,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId))
    .orderBy(cartItems.id);
}

export async function findItem(cartId: number, productId: number) {
  const [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
    )
    .limit(1);

  return item;
}

export async function insertItem(input: {
  cartId: number;
  productId: number;
  quantity: number;
}) {
  await db.insert(cartItems).values(input);
}

export async function updateItemQuantity(id: number, quantity: number) {
  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id));
}

export async function deleteItem(cartId: number, productId: number) {
  const [result] = await db
    .delete(cartItems)
    .where(
      and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)),
    );

  return result.affectedRows;
}

export async function clearCart(cartId: number, client: Executor = db) {
  await client.delete(cartItems).where(eq(cartItems.cartId, cartId));
}
