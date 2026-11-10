import { Queue } from "bullmq";
import { logger } from "../config/logger.ts";
import { createRedisConnection } from "./connection.ts";

export type EmailJobName = "order-confirmation" | "payment-receipt";

export type EmailJobData = {
  to: string;
  name: string;
  orderId?: number;
  total?: string;
  amount?: string;
};

export type InventoryJobName = "low-stock-check";

export type InventoryJobData = {
  productIds: number[];
};

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

let emailQueue: Queue<EmailJobData, void, EmailJobName> | undefined;
let inventoryQueue: Queue<InventoryJobData, void, InventoryJobName> | undefined;

function getEmailQueue() {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData, void, EmailJobName>("email", {
      connection: createRedisConnection({ enableOfflineQueue: false }),
      defaultJobOptions,
    });
  }

  return emailQueue;
}

function getInventoryQueue() {
  if (!inventoryQueue) {
    inventoryQueue = new Queue<InventoryJobData, void, InventoryJobName>(
      "inventory",
      {
        connection: createRedisConnection({ enableOfflineQueue: false }),
        defaultJobOptions,
      },
    );
  }

  return inventoryQueue;
}

function logEnqueueError(label: string, job: string, err: unknown) {
  logger.warn(`Failed to enqueue ${label} job`, {
    job,
    error: err instanceof Error ? err.message : String(err),
  });
}

function enqueueEmailJob(name: EmailJobName, data: EmailJobData) {
  void getEmailQueue()
    .add(name, data)
    .catch((err: unknown) => logEnqueueError("email", name, err));
}

function enqueueInventoryJob(name: InventoryJobName, data: InventoryJobData) {
  void getInventoryQueue()
    .add(name, data)
    .catch((err: unknown) => logEnqueueError("inventory", name, err));
}

export function enqueueOrderConfirmation(input: {
  to: string;
  name: string;
  orderId: number;
  total: string;
}) {
  enqueueEmailJob("order-confirmation", input);
}

export function enqueuePaymentReceipt(input: {
  to: string;
  name: string;
  orderId: number;
  amount: string;
}) {
  enqueueEmailJob("payment-receipt", input);
}

export function enqueueLowStockCheck(productIds: number[]) {
  enqueueInventoryJob("low-stock-check", { productIds });
}
