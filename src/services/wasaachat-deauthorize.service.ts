import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../config/logger.ts";
import * as userRepository from "../repositories/user.repository.ts";
import { AppError, BadRequestError, UnauthorizedError } from "../utils/errors.ts";

// WasaaChat's deauthorize webhook (Sign in with WasaaChat, section 12):
// sent when a user removes the app under Connected apps, deletes their
// account, the app is suspended, or a test user is removed.
// https://wasaachat.com/developers/sign-in-with-wasaachat
//
// Signature: X-Wasaa-Signature = "sha256=" + hex(HMAC-SHA256(secret, "<X-Wasaa-Timestamp>.<raw body>"))
// The secret is the OAuth webhook secret (whsec_…), separate from the payments webhook secret.

const TOLERANCE_SECONDS = 300;

export function verifyDeauthorizeSignature(
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!timestamp || !/^\d+$/.test(timestamp) || !signature) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > TOLERANCE_SECONDS) return false;

  const expected = `sha256=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

type DeauthorizeEvent = { event?: unknown; sub?: unknown; client_id?: unknown; occurred_at?: unknown };

export async function handleDeauthorize(input: {
  rawBody: string;
  timestamp?: string;
  signature?: string;
  deliveryId?: string;
}) {
  const secret = process.env.WASAACHAT_PAYOUT_DEAUTHORIZE_SECRET;
  if (!secret) throw new AppError(500, "WASAACHAT_PAYOUT_DEAUTHORIZE_SECRET is not configured");

  if (!verifyDeauthorizeSignature(input.rawBody, input.timestamp, input.signature, secret)) {
    throw new UnauthorizedError("Invalid deauthorize signature");
  }

  let event: DeauthorizeEvent;
  try {
    event = JSON.parse(input.rawBody) as DeauthorizeEvent;
  } catch {
    throw new BadRequestError("Invalid deauthorize payload");
  }

  if (event.event !== "app.deauthorized" || typeof event.sub !== "string" || !event.sub) {
    throw new BadRequestError("Malformed deauthorize event");
  }
  if (process.env.WASAACHAT_CLIENT_ID && event.client_id !== process.env.WASAACHAT_CLIENT_ID) {
    throw new BadRequestError("Deauthorize event is for another app");
  }

  const occurredAt = typeof event.occurred_at === "string" && !Number.isNaN(Date.parse(event.occurred_at))
    ? new Date(event.occurred_at)
    : new Date();

  // Ends every web sign-in session issued before the disconnect. Idempotent:
  // a repeat (or older) delivery changes nothing.
  const changed = await userRepository.revokeWebSessions(event.sub, occurredAt);
  logger.info("WasaaChat deauthorized a user", { deliveryId: input.deliveryId, changed, occurredAt: occurredAt.toISOString() });
}
