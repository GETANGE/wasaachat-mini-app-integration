import { eq } from "drizzle-orm";
import { db } from "../config/db.ts";
import { webhookDeliveries } from "../models/schema.ts";
import type { Executor } from "./types.ts";

export async function findDelivery(deliveryId: string, client: Executor = db) {
  const [delivery] = await client
    .select({ id: webhookDeliveries.id })
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.deliveryId, deliveryId))
    .limit(1);

  return delivery;
}

export async function createDelivery(
  input: {
    deliveryId: string;
    event: string;
    payload: unknown;
  },
  client: Executor = db,
) {
  await client.insert(webhookDeliveries).values(input);
}
