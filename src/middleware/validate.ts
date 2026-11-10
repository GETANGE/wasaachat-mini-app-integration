import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../utils/errors.ts";

export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      next(new BadRequestError(message));
      return;
    }

    req.body = result.data;
    next();
  };
}
