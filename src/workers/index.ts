import { logger } from "../config/logger.ts";
import { startEmailWorker } from "./email.worker.ts";
import { startInventoryWorker } from "./inventory.worker.ts";

const workers = [startEmailWorker(), startInventoryWorker()];

logger.info("Workers started", { queues: ["email", "inventory"] });

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info("Shutting down workers", { signal });

  await Promise.all(workers.map((worker) => worker.close()));
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
