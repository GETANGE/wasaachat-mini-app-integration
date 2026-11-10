import type { Request, Response } from "express";
import { BadRequestError } from "../utils/errors.ts";
import {
  handleWebhook,
  loginWithLaunchCode,
} from "../services/wasaachat.service.ts";

export async function session(req: Request, res: Response) {
  const result = await loginWithLaunchCode(req.body.code);
  res.json(result);
}

export async function webhook(req: Request, res: Response) {
  if (!req.rawBody) {
    throw new BadRequestError("Raw request body is unavailable");
  }

  await handleWebhook({
    rawBody: req.rawBody.toString("utf8"),
    signature: req.get("X-Wasaa-Signature") ?? undefined,
    deliveryHeader: req.get("X-Wasaa-Delivery") ?? undefined,
  });

  res.status(200).json({ received: true });
}
