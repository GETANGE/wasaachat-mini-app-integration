import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "../config/db.ts";
import { logger } from "../config/logger.ts";
import * as orderRepository from "../repositories/order.repository.ts";
import * as paymentRepository from "../repositories/payment.repository.ts";
import * as userRepository from "../repositories/user.repository.ts";
import * as webhookDeliveryRepository from "../repositories/webhook-delivery.repository.ts";
import { enqueuePaymentReceipt } from "../queues/index.ts";
import { issueSession } from "./session.service.ts";
import { AppError, UnauthorizedError } from "../utils/errors.ts";
import { toCents } from "../utils/money.ts";

const DEFAULT_BASE = "https://api.wasaachat.com/api/v1/core";

export type WasaaPaymentIntent = {
  intent_id: string;
  amount: string;
  currency: string;
  description?: string;
  reference: string;
  status:
    | "pending"
    | "confirmed"
    | "paid"
    | "declined"
    | "expired"
    | "failed"
    | "refunded";
  fee?: string | null;
  net?: string | null;
  refunded_amount?: string | null;
  expires_at?: string;
  created_at?: string;
};

type WebhookEvent = {
  event: string;
  delivery_id?: string;
  occurred_at?: string;
  data: Record<string, unknown> & Partial<WasaaPaymentIntent>;
};

function getBase(): string {
  return process.env.WASAA_BASE ?? DEFAULT_BASE;
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new AppError(500, `WasaaChat is not configured: ${name} is missing`);
  }

  return value;
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null }> {
  const response = await fetch(`${getBase()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  const text = await response.text();
  let json: Record<string, unknown> | null = null;

  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  return { ok: response.ok, status: response.status, json };
}

// ---------- Launch codes (code2Session) ----------
// The page sends wasaa.launchCode; we exchange it with our app secret for the
// user's bridge session. Single-use, valid 5 minutes. Unknown app, wrong
// secret and used/expired code all return APP_LAUNCH_TOKEN_INVALID (401).
// https://wasaachat.com/developers/launch-codes

export type LaunchSession = {
  open_user_id: string;
  granted_scopes: string[];
  session_token: string;
  expires_in: number;
};

export async function exchangeLaunchCode(code: string): Promise<LaunchSession> {
  const result = await postJson("/marketplace/bridge/session", {
    app_id: requireEnv("WASAA_APP_ID"),
    app_secret: requireEnv("WASAA_APP_SECRET"),
    code,
  });

  if (!result.ok || typeof result.json?.open_user_id !== "string") {
    logger.warn("WasaaChat launch code rejected", { status: result.status });
    throw new UnauthorizedError("Launch code was rejected; reopen the app");
  }

  return result.json as unknown as LaunchSession;
}

export async function verifyPaymentIntent(
  intentId: string,
): Promise<WasaaPaymentIntent> {
  const result = await postJson("/marketplace/bridge/payments/verify", {
    app_id: requireEnv("WASAA_APP_ID"),
    app_secret: requireEnv("WASAA_APP_SECRET"),
    intent_id: intentId,
  });

  if (!result.ok || typeof result.json?.intent_id !== "string") {
    logger.warn("WasaaChat payment verification failed", {
      intentId,
      status: result.status,
    });
    throw new AppError(502, "Could not verify the payment with WasaaChat");
  }

  return result.json as unknown as WasaaPaymentIntent;
}

// With profile.read, the bridge session can read the user's public display
// name (GET /marketplace/bridge/profile). Best effort: sign-in never fails on it.
export async function fetchBridgeDisplayName(sessionToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${getBase()}/marketplace/bridge/profile`, {
      headers: { authorization: `Bearer ${sessionToken}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { display_name?: unknown };
    const name = typeof json.display_name === "string" ? json.display_name.trim().slice(0, 120) : "";
    return name || null;
  } catch {
    return null;
  }
}

// Finds or creates the shop user for a WasaaChat id. The mini-app's
// open_user_id and Sign in with WasaaChat's sub are the same value.
export async function upsertWasaaUser(openUserId: string, displayName: string | null) {
  const name = displayName?.slice(0, 120) || null;
  let user = await userRepository.findByWasaaOpenUserId(openUserId);

  if (!user) {
    const id = await userRepository.createWasaaUser({
      name: name ?? "WasaaChat customer",
      wasaaOpenUserId: openUserId,
    });
    user = await userRepository.findPublicById(id);
  } else if (name && name !== user.name) {
    await userRepository.updateName(user.id, name);
    user = { ...user, name };
  }

  if (!user) {
    throw new AppError(500, "Could not create the WasaaChat user");
  }
  return user;
}

export async function loginWithLaunchCode(code: string) {
  const session = await exchangeLaunchCode(code);
  const displayName = session.granted_scopes.includes("profile.read")
    ? await fetchBridgeDisplayName(session.session_token)
    : null;
  const user = await upsertWasaaUser(session.open_user_id, displayName);

  return {
    user,
    scopes: session.granted_scopes,
    ...issueSession(user, session.expires_in),
  };
}

function parseSignatureHeader(header: string) {
  const parts: Record<string, string> = {};

  for (const pair of header.split(",")) {
    const index = pair.indexOf("=");

    if (index === -1) {
      continue;
    }

    parts[pair.slice(0, index).trim()] = pair.slice(index + 1).trim();
  }

  return parts;
}

export function verifyWasaSignature(
  rawBody: string | Buffer,
  header: string | undefined | null,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!header) {
    return false;
  }

  const parts = parseSignatureHeader(header);
  const timestamp = Number(parts.t);

  if (!Number.isInteger(timestamp) || !parts.v1) {
    return false;
  }

  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(parts.v1, "utf8");

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "ER_DUP_ENTRY"
  );
}

async function fulfilPaidIntent(intent: WasaaPaymentIntent) {
  const result = await db.transaction(async (tx) => {
    const order = await orderRepository.findByPaymentReferenceForUpdate(
      tx,
      intent.reference,
    );

    if (!order) {
      logger.warn("Paid intent has no matching order", {
        intentId: intent.intent_id,
        reference: intent.reference,
      });
      return { orderId: null, userId: null, newlyPaid: false };
    }

    if (order.status === "refunded") {
      return { orderId: order.id, userId: order.userId, newlyPaid: false };
    }

    if (toCents(intent.amount) !== toCents(order.total)) {
      logger.error("Payment amount does not match order total", {
        intentId: intent.intent_id,
        reference: intent.reference,
        intentAmount: intent.amount,
        orderTotal: order.total,
      });
      return { orderId: order.id, userId: order.userId, newlyPaid: false };
    }

    const newlyPaid = order.status !== "paid";

    if (newlyPaid) {
      await orderRepository.updateStatus(order.id, "paid", tx);
    }

    const existing = await paymentRepository.findByProviderRef(
      intent.intent_id,
      tx,
    );

    if (existing) {
      if (existing.status !== "paid") {
        await paymentRepository.updateStatus(existing.id, { status: "paid" }, tx);
      }
    } else {
      await paymentRepository.insertPayment(
        {
          orderId: order.id,
          provider: "wasaachat",
          providerRef: intent.intent_id,
          amount: intent.amount,
          status: "paid",
        },
        tx,
      );
    }

    return { orderId: order.id, userId: order.userId, newlyPaid };
  });

  if (result.newlyPaid && result.userId) {
    const customer = await userRepository.findPublicById(result.userId);

    if (customer?.email) {
      enqueuePaymentReceipt({
        to: customer.email,
        name: customer.name,
        orderId: result.orderId!,
        amount: intent.amount,
      });
    }
  }

  return result;
}

async function refundIntent(intent: WasaaPaymentIntent) {
  const refundedAmount = intent.refunded_amount ?? intent.amount;

  return db.transaction(async (tx) => {
    const order = await orderRepository.findByPaymentReferenceForUpdate(
      tx,
      intent.reference,
    );

    if (!order) {
      logger.warn("Refunded intent has no matching order", {
        intentId: intent.intent_id,
        reference: intent.reference,
      });
      return;
    }

    const existing = await paymentRepository.findByProviderRef(
      intent.intent_id,
      tx,
    );

    if (existing) {
      await paymentRepository.updateStatus(
        existing.id,
        { status: "refunded", refundedAmount },
        tx,
      );
    } else {
      await paymentRepository.insertPayment(
        {
          orderId: order.id,
          provider: "wasaachat",
          providerRef: intent.intent_id,
          amount: intent.amount,
          refundedAmount,
          status: "refunded",
        },
        tx,
      );
    }

    await orderRepository.updateStatus(order.id, "refunded", tx);

    logger.info("Order marked refunded", {
      orderId: order.id,
      intentId: intent.intent_id,
      refundedAmount,
    });
  });
}

async function recordFailedAttempt(
  event: string,
  data: Record<string, unknown>,
) {
  const intentId = data.intent_id;

  if (typeof intentId !== "string") {
    return;
  }

  const existing = await paymentRepository.findByProviderRef(intentId);

  if (existing) {
    return;
  }

  const reference = typeof data.reference === "string" ? data.reference : null;
  const order = reference
    ? await orderRepository.findByPaymentReference(reference)
    : undefined;

  if (!order) {
    logger.info("Payment attempt without matching order", {
      event,
      intentId,
      reference,
    });
    return;
  }

  await paymentRepository.insertPayment({
    orderId: order.id,
    provider: "wasaachat",
    providerRef: intentId,
    amount: typeof data.amount === "string" ? data.amount : order.total,
    status: "failed",
  });

  logger.info("Payment attempt recorded", { event, intentId, orderId: order.id });
}

export async function handleWebhook(input: {
  rawBody: string;
  signature?: string;
  deliveryHeader?: string;
}) {
  const secret = requireEnv("WASAA_WEBHOOK_SECRET");

  if (!verifyWasaSignature(input.rawBody, input.signature, secret)) {
    throw new AppError(400, "Invalid webhook signature");
  }

  let event: WebhookEvent;

  try {
    event = JSON.parse(input.rawBody) as WebhookEvent;
  } catch {
    throw new AppError(400, "Invalid webhook payload");
  }

  const deliveryId = event.delivery_id ?? input.deliveryHeader;

  if (!deliveryId || typeof event.event !== "string") {
    throw new AppError(400, "Malformed webhook event");
  }

  const existing = await webhookDeliveryRepository.findDelivery(deliveryId);

  if (existing) {
    logger.info("Duplicate webhook ignored", {
      deliveryId,
      event: event.event,
    });
    return;
  }

  switch (event.event) {
    case "payment_intent.paid": {
      const intentId = event.data.intent_id;

      if (typeof intentId !== "string") {
        throw new AppError(400, "Webhook is missing an intent id");
      }

      const intent = await verifyPaymentIntent(intentId);

      if (intent.status !== "paid") {
        logger.warn("Paid webhook but intent is not paid", {
          intentId: intent.intent_id,
          status: intent.status,
        });
        break;
      }

      await fulfilPaidIntent(intent);
      break;
    }
    case "payment_intent.refunded": {
      const intentId = event.data.intent_id;

      if (typeof intentId !== "string") {
        throw new AppError(400, "Webhook is missing an intent id");
      }

      const intent = await verifyPaymentIntent(intentId);
      await refundIntent(intent);
      break;
    }
    case "payment_intent.declined":
    case "payment_intent.expired":
    case "payment_intent.failed":
      await recordFailedAttempt(event.event, event.data);
      break;
    case "payout.completed":
    case "payout.failed":
      logger.info("Payout webhook received", {
        event: event.event,
        payoutId: event.data.payout_id,
      });
      break;
    case "webhook.test":
      logger.info("WasaaChat webhook test received");
      break;
    default:
      logger.info("Unhandled webhook event", { event: event.event });
  }

  try {
    await webhookDeliveryRepository.createDelivery({
      deliveryId,
      event: event.event,
      payload: event,
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) {
      throw err;
    }
  }
}
