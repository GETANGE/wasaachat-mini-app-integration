import IORedis from "ioredis";
import { logger } from "../config/logger.ts";

export const REDIS_URL =
  process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

export function createRedisConnection(
  options: { enableOfflineQueue?: boolean } = {},
): IORedis {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: options.enableOfflineQueue ?? true,
  });

  connection.on("error", (err) => {
    logger.debug("Redis connection error", { message: err.message });
  });

  return connection;
}
