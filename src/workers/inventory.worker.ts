import { Worker } from "bullmq";
import { logger } from "../config/logger.ts";
import { createRedisConnection } from "../queues/connection.ts";
import type { InventoryJobData, InventoryJobName } from "../queues/index.ts";
import * as productRepository from "../repositories/product.repository.ts";

const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD ?? 5);

export function startInventoryWorker() {
  const worker = new Worker<InventoryJobData, void, InventoryJobName>(
    "inventory",
    async (job) => {
      if (job.name === "low-stock-check") {
        const lowStock = await productRepository.findLowStock(
          job.data.productIds,
          LOW_STOCK_THRESHOLD,
        );

        if (lowStock.length > 0) {
          logger.warn("Low stock detected", {
            threshold: LOW_STOCK_THRESHOLD,
            products: lowStock.map((product) => ({
              id: product.id,
              sku: product.sku,
              name: product.name,
              stock: product.stock,
            })),
          });
        }
      }

      logger.info("Inventory job processed", {
        jobId: job.id,
        job: job.name,
      });
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error("Inventory job failed", {
      jobId: job?.id,
      job: job?.name,
      error: err.message,
    });
  });

  return worker;
}
