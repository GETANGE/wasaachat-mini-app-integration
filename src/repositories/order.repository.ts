import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.ts";
import { orderItems, orders } from "../models/schema.ts";
import type { Executor, Transaction } from "./types.ts";

export type OrderStatus = typeof orders.$inferInsert.status;

export async function findByIdForUpdate(
  client: Transaction,
  orderId: number,
) {
  const [order] = await client
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)
    .for("update");

  return order;
}

export async function findByIdForUserForUpdate(
  client: Transaction,
  userId: number,
  orderId: number,
) {
  const [order] = await client
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1)
    .for("update");

  return order;
}

export async function findByIdForUser(userId: number, orderId: number) {
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  return order;
}

export async function findById(orderId: number, client: Executor = db) {
  const [order] = await client
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return order;
}

export async function listByUser(userId: number) {
  return db
    .select()
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));
}

export async function findItems(orderId: number, client: Executor = db) {
  return client
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
}

export async function findItemsForOrders(orderIds: number[]) {
  if (orderIds.length === 0) {
    return [];
  }

  return db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds));
}

export async function insertOrder(
  values: typeof orders.$inferInsert,
  client: Executor = db,
) {
  const [created] = await client
    .insert(orders)
    .values(values)
    .$returningId();

  return created!.id;
}

export async function insertItems(
  rows: Array<typeof orderItems.$inferInsert>,
  client: Executor = db,
) {
  await client.insert(orderItems).values(rows);
}

export async function updateStatus(
  orderId: number,
  status: OrderStatus,
  client: Executor = db,
) {
  await client
    .update(orders)
    .set({ status })
    .where(eq(orders.id, orderId));
}

export async function updatePaymentReference(
  orderId: number,
  paymentReference: string,
  client: Executor = db,
) {
  await client
    .update(orders)
    .set({ paymentReference })
    .where(eq(orders.id, orderId));
}

export async function findByPaymentReferenceForUpdate(
  client: Transaction,
  paymentReference: string,
) {
  const [order] = await client
    .select()
    .from(orders)
    .where(eq(orders.paymentReference, paymentReference))
    .limit(1)
    .for("update");

  return order;
}

export async function findByPaymentReference(paymentReference: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.paymentReference, paymentReference))
    .limit(1);

  return order;
}
