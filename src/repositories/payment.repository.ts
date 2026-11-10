import { eq } from "drizzle-orm";
import { db } from "../config/db.ts";
import { payments } from "../models/schema.ts";
import type { Executor } from "./types.ts";

export async function insertPayment(
  values: typeof payments.$inferInsert,
  client: Executor = db,
) {
  const [created] = await client
    .insert(payments)
    .values(values)
    .$returningId();

  return created!.id;
}

export async function findById(id: number, client: Executor = db) {
  const [payment] = await client
    .select()
    .from(payments)
    .where(eq(payments.id, id))
    .limit(1);

  return payment;
}

export async function findByProviderRef(
  providerRef: string,
  client: Executor = db,
) {
  const [payment] = await client
    .select()
    .from(payments)
    .where(eq(payments.providerRef, providerRef))
    .limit(1);

  return payment;
}

export async function updateStatus(
  id: number,
  values: {
    status: typeof payments.$inferInsert.status;
    refundedAmount?: string;
  },
  client: Executor = db,
) {
  await client.update(payments).set(values).where(eq(payments.id, id));
}
