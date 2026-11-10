import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.ts";
import { logger } from "../config/logger.ts";

function mysqlCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation failed",
      issues: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const code = mysqlCode(err);

  if (code === "ER_DUP_ENTRY") {
    res.status(409).json({ error: "Duplicate value" });
    return;
  }

  if (code === "ER_ROW_IS_REFERENCED_2") {
    res.status(409).json({ error: "Record is referenced by other data" });
    return;
  }

  logger.error("Unhandled request error", {
    error:
      err instanceof Error
        ? { message: err.message, stack: err.stack }
        : err,
  });

  const message =
    process.env.NODE_ENV !== "production" && err instanceof Error
      ? err.message
      : "Internal server error";

  res.status(500).json({ error: message });
}
