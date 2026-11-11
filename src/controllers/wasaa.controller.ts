import type { Request, Response } from "express";
import { BadRequestError } from "../utils/errors.ts";
import { setCookie } from "../utils/cookies.ts";
import { APP_SESSION_COOKIE, APP_SESSION_COOKIE_OPTIONS } from "../services/session.service.ts";
import { handleDeauthorize } from "../services/wasaachat-deauthorize.service.ts";
import {
  handleWebhook,
  loginWithLaunchCode,
} from "../services/wasaachat.service.ts";

export async function session(req: Request, res: Response) {
  const result = await loginWithLaunchCode(req.body.code);
  // The session cookie, as in https://wasaachat.com/developers/launch-codes.
  // The token is also returned only so the page can fall back to a Bearer
  // header if the browser refuses cookies in WasaaChat's frame.
  setCookie(req, res, APP_SESSION_COOKIE, result.accessToken, {
    ...APP_SESSION_COOKIE_OPTIONS,
    maxAgeSeconds: result.expiresIn,
  });
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

// POST /api/wasaa/deauthorize — WasaaChat's app.deauthorized webhook.
export async function deauthorize(req: Request, res: Response) {
  if (!req.rawBody) {
    throw new BadRequestError("Raw request body is unavailable");
  }

  await handleDeauthorize({
    rawBody: req.rawBody.toString("utf8"),
    timestamp: req.get("X-Wasaa-Timestamp") ?? undefined,
    signature: req.get("X-Wasaa-Signature") ?? undefined,
    deliveryId: req.get("X-Wasaa-Delivery") ?? undefined,
  });

  res.status(204).end();
}
