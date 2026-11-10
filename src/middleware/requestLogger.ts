import morgan from "morgan";
import { logger } from "../config/logger.ts";

const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export const requestLogger = morgan(
  process.env.NODE_ENV === "production" ? "combined" : "dev",
  {
    stream,
    skip: (req) =>
      process.env.NODE_ENV === "test" || req.url === "/health",
  },
);
