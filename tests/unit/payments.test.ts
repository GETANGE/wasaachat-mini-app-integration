import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// In-memory stand-ins for the database layers, so the payment rules can be
// exercised without MySQL.
type Order = { id: number; userId: number; status: string; total: string; paymentReference: string | null };
const orders = new Map<number, Order>();
const payments: { orderId: number; providerRef: string; status: string; amount: string }[] = [];
const errors: string[] = [];

mock.module("../../src/config/db.ts", () => ({ db: { transaction: async (fn: (tx: unknown) => unknown) => fn({}) } }));
mock.module("../../src/config/logger.ts", () => ({
  logger: { info: () => {}, warn: () => {}, error: (msg: string) => errors.push(msg), debug: () => {} },
}));
mock.module("../../src/repositories/order.repository.ts", () => ({
  findByPaymentReferenceForUpdate: async (_tx: unknown, ref: string) => [...orders.values()].find((o) => o.paymentReference === ref),
  findByPaymentReference: async (ref: string) => [...orders.values()].find((o) => o.paymentReference === ref),
  findByIdForUpdate: async (_tx: unknown, id: number) => orders.get(id),
  findById: async (id: number) => orders.get(id),
  findByIdForUser: async (userId: number, id: number) => (orders.get(id)?.userId === userId ? orders.get(id) : undefined),
  updateStatus: async (id: number, status: string) => {
    orders.get(id)!.status = status;
  },
}));
mock.module("../../src/repositories/payment.repository.ts", () => ({
  findByProviderRef: async (ref: string) => payments.find((p) => p.providerRef === ref),
  insertPayment: async (row: { orderId: number; providerRef: string; status: string; amount: string }) => {
    payments.push(row);
  },
  updateStatus: async () => {},
}));
mock.module("../../src/repositories/user.repository.ts", () => ({ findPublicById: async () => ({ id: 1, name: "A", email: null }) }));
mock.module("../../src/queues/index.ts", () => ({ enqueuePaymentReceipt: () => {} }));

const { confirmOrderPayment, orderIdFromReference } = await import("../../src/services/wasaachat.service.ts");
const { exceedsWasaaPaymentLimit, MAX_WASAA_PAYMENT_CENTS } = await import("../../src/utils/money.ts");

// What WasaaChat's payments/verify answers for each intent id. Only that URL
// is faked, and only during these tests; everything else uses the real fetch.
const intents = new Map<string, Record<string, unknown>>();
const realFetch = globalThis.fetch;
const fakeFetch = (async (url: string | URL, init?: RequestInit) => {
  if (!String(url).endsWith("/marketplace/bridge/payments/verify")) return realFetch(url, init);
  const { intent_id } = JSON.parse(String(init?.body));
  const intent = intents.get(intent_id);
  return new Response(JSON.stringify(intent ?? { code: "APP_LAUNCH_TOKEN_INVALID" }), { status: intent ? 200 : 401 });
}) as typeof fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
});

beforeEach(() => {
  globalThis.fetch = fakeFetch;
  orders.clear();
  payments.length = 0;
  errors.length = 0;
  intents.clear();
  process.env.WASAACHAT_CLIENT_ID = "app";
  process.env.WASAACHAT_CODE_2_SESSION = "secret";
  orders.set(7, { id: 7, userId: 1, status: "pending", total: "1750.00", paymentReference: "order-7-bbbbbbbbbbbb" });
});

const paidIntent = (id: string, reference: string, amount = "1750.00") =>
  intents.set(id, { intent_id: id, reference, amount, currency: "KES", status: "paid" });

describe("references", () => {
  test("carry the order id for every attempt", () => {
    expect(orderIdFromReference("order-7-a1b2c3d4e5f6")).toBe(7);
    expect(orderIdFromReference("order-x-123")).toBeNull();
    expect(orderIdFromReference("refund-7")).toBeNull();
  });
});

describe("KES 100,000 per payment", () => {
  test("ceiling matches WasaaChat's limit", () => {
    expect(MAX_WASAA_PAYMENT_CENTS).toBe(10_000_000);
    expect(exceedsWasaaPaymentLimit(10_000_000)).toBe(false);
    expect(exceedsWasaaPaymentLimit(10_000_001)).toBe(true);
  });
});

describe("confirming a payment from the page", () => {
  test("marks the order paid after WasaaChat verifies it", async () => {
    paidIntent("pi-2", "order-7-bbbbbbbbbbbb");
    expect(await confirmOrderPayment(1, 7, "pi-2")).toEqual({ paymentStatus: "paid", orderStatus: "paid" });
    expect(payments).toHaveLength(1);
  });

  test("an earlier attempt's reference still finds its order", async () => {
    paidIntent("pi-1", "order-7-aaaaaaaaaaaa"); // order now stores a newer reference
    expect((await confirmOrderPayment(1, 7, "pi-1")).orderStatus).toBe("paid");
  });

  test("a second successful payment is recorded and flagged, not double-counted", async () => {
    paidIntent("pi-1", "order-7-aaaaaaaaaaaa");
    paidIntent("pi-2", "order-7-bbbbbbbbbbbb");
    await confirmOrderPayment(1, 7, "pi-1");
    await confirmOrderPayment(1, 7, "pi-2");
    expect(orders.get(7)!.status).toBe("paid");
    expect(payments.map((p) => p.providerRef)).toEqual(["pi-1", "pi-2"]);
    expect(errors.some((e) => e.includes("refund needed"))).toBe(true);
  });

  test("a payment for a cancelled order doesn't revive it", async () => {
    orders.get(7)!.status = "cancelled";
    paidIntent("pi-2", "order-7-bbbbbbbbbbbb");
    await confirmOrderPayment(1, 7, "pi-2");
    expect(orders.get(7)!.status).toBe("cancelled");
    expect(errors.some((e) => e.includes("refund needed"))).toBe(true);
  });

  test("repeating a confirmation changes nothing", async () => {
    paidIntent("pi-2", "order-7-bbbbbbbbbbbb");
    await confirmOrderPayment(1, 7, "pi-2");
    await confirmOrderPayment(1, 7, "pi-2");
    expect(payments).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  test("a payment for another order or another user is refused", async () => {
    paidIntent("pi-9", "order-99-cccccccccccc");
    await expect(confirmOrderPayment(1, 7, "pi-9")).rejects.toThrow("not for this order");
    await expect(confirmOrderPayment(2, 7, "pi-9")).rejects.toThrow("Order not found");
    expect(orders.get(7)!.status).toBe("pending");
  });

  test("an amount that doesn't match the order is not accepted", async () => {
    paidIntent("pi-2", "order-7-bbbbbbbbbbbb", "1.00");
    expect((await confirmOrderPayment(1, 7, "pi-2")).orderStatus).toBe("pending");
  });

  test("a declined payment leaves the order pending", async () => {
    intents.set("pi-3", { intent_id: "pi-3", reference: "order-7-bbbbbbbbbbbb", amount: "1750.00", status: "declined" });
    expect(await confirmOrderPayment(1, 7, "pi-3")).toEqual({ paymentStatus: "declined", orderStatus: "pending" });
  });
});
