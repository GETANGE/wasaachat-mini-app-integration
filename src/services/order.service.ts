import { db } from "../config/db.ts";
import type { ShippingAddress } from "../models/schema.ts";
import type { Transaction } from "../repositories/types.ts";
import * as cartRepository from "../repositories/cart.repository.ts";
import * as orderRepository from "../repositories/order.repository.ts";
import * as productRepository from "../repositories/product.repository.ts";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors.ts";
import { exceedsWasaaPaymentLimit, fromCents, shippingFor, toCents } from "../utils/money.ts";
import { invalidateProducts } from "../cache/index.ts";
import * as userRepository from "../repositories/user.repository.ts";
import {
  enqueueLowStockCheck,
  enqueueOrderConfirmation,
} from "../queues/index.ts";
import { randomBytes } from "node:crypto";

async function restoreStock(tx: Transaction, orderId: number) {
  const items = await orderRepository.findItems(orderId, tx);

  for (const item of items) {
    await productRepository.incrementStock(tx, item.productId, item.quantity);
  }
}

export async function checkout(userId: number, shippingAddress: ShippingAddress) {
  const result = await db.transaction(async (tx) => {
    const cart = await cartRepository.findByUserId(userId, tx);

    if (!cart) {
      throw new BadRequestError("Cart is empty");
    }

    const rows = await cartRepository.findItems(cart.id, tx);

    if (rows.length === 0) {
      throw new BadRequestError("Cart is empty");
    }

    const locked = await productRepository.findByIdsForUpdate(
      tx,
      rows.map((row) => row.productId),
    );

    const lockedById = new Map(locked.map((product) => [product.id, product]));

    let subtotalCents = 0;
    const lines: Array<{
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
    }> = [];

    for (const row of rows) {
      const current = lockedById.get(row.productId);

      if (!current || !current.active) {
        throw new BadRequestError(`${row.name} is no longer available`);
      }

      if (current.stock < row.quantity) {
        throw new ConflictError(`Insufficient stock for ${current.name}`);
      }

      const unitCents = toCents(current.price);
      subtotalCents += unitCents * row.quantity;

      lines.push({
        productId: current.id,
        productName: current.name,
        quantity: row.quantity,
        unitPrice: fromCents(unitCents),
      });
    }

    const shippingFeeCents = shippingFor(subtotalCents);
    const totalCents = subtotalCents + shippingFeeCents;

    // Checked before the order exists, so no stock is held for an order that can't be paid.
    if (exceedsWasaaPaymentLimit(totalCents)) {
      throw new BadRequestError(
        "WasaaChat payments are limited to KES 100,000 per order. Remove some items or split them into separate orders.",
      );
    }

    const orderId = await orderRepository.insertOrder(
      {
        userId,
        status: "pending",
        subtotal: fromCents(subtotalCents),
        shippingFee: fromCents(shippingFeeCents),
        total: fromCents(totalCents),
        shippingAddress,
      },
      tx,
    );

    await orderRepository.insertItems(
      lines.map((line) => ({ orderId, ...line })),
      tx,
    );

    for (const line of lines) {
      await productRepository.decrementStock(
        tx,
        line.productId,
        line.quantity,
      );
    }

    await cartRepository.clearCart(cart.id, tx);

    const order = await orderRepository.findById(orderId, tx);
    const items = await orderRepository.findItems(orderId, tx);

    return { ...order!, items };
  });

  invalidateProducts();

  const customer = await userRepository.findPublicById(userId);

  if (customer?.email) {
    enqueueOrderConfirmation({
      to: customer.email,
      name: customer.name,
      orderId: result.id,
      total: result.total,
    });
  }

  enqueueLowStockCheck(result.items.map((item) => item.productId));

  return result;
}

export async function listOrders(userId: number) {
  const rows = await orderRepository.listByUser(userId);

  if (rows.length === 0) {
    return [];
  }

  const items = await orderRepository.findItemsForOrders(
    rows.map((row) => row.id),
  );

  const itemsByOrder = new Map<number, typeof items>();

  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }

  return rows.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function getOrder(userId: number, orderId: number) {
  const order = await orderRepository.findByIdForUser(userId, orderId);

  if (!order) {
    throw new NotFoundError("Order not found");
  }

  const items = await orderRepository.findItems(order.id);

  return { ...order, items };
}

export async function cancelOrder(userId: number, orderId: number) {
  const result = await db.transaction(async (tx) => {
    const order = await orderRepository.findByIdForUserForUpdate(
      tx,
      userId,
      orderId,
    );

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status !== "pending") {
      throw new ConflictError("Only pending orders can be cancelled");
    }

    await restoreStock(tx, order.id);
    await orderRepository.updateStatus(order.id, "cancelled", tx);

    const updated = await orderRepository.findById(order.id, tx);
    const items = await orderRepository.findItems(order.id, tx);

    return { ...updated!, items };
  });

  invalidateProducts();

  return result;
}

export async function prepareWasaPayment(userId: number, orderId: number) {
  return db.transaction(async (tx) => {
    const order = await orderRepository.findByIdForUserForUpdate(
      tx,
      userId,
      orderId,
    );

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (order.status !== "pending") {
      throw new ConflictError("Order is not awaiting payment");
    }

    if (exceedsWasaaPaymentLimit(toCents(order.total))) {
      throw new ConflictError("WasaaChat payments are limited to KES 100,000 per order.");
    }

    // A new reference per attempt: WasaaChat treats a reference as one purchase
    // forever, so a declined attempt can only be retried with a fresh one.
    // Earlier attempts stay traceable through the order id inside it.
    const reference = `order-${order.id}-${randomBytes(6).toString("hex")}`;
    await orderRepository.updatePaymentReference(order.id, reference, tx);

    return {
      orderId: order.id,
      reference,
      amount: order.total,
      currency: "KES",
      description: `VIVA order #${order.id}`.slice(0, 140),
    };
  });
}

export async function updateOrderStatus(
  orderId: number,
  status: orderRepository.OrderStatus,
) {
  const result = await db.transaction(async (tx) => {
    const order = await orderRepository.findByIdForUpdate(tx, orderId);

    if (!order) {
      throw new NotFoundError("Order not found");
    }

    if (status === "cancelled" && order.status !== "cancelled") {
      await restoreStock(tx, order.id);
    }

    await orderRepository.updateStatus(order.id, status, tx);

    const updated = await orderRepository.findById(order.id, tx);
    const items = await orderRepository.findItems(order.id, tx);

    return { ...updated!, items };
  });

  invalidateProducts();

  return result;
}
