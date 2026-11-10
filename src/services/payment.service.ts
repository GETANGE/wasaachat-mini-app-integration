import { db } from "../config/db.ts";
import * as orderRepository from "../repositories/order.repository.ts";
import * as paymentRepository from "../repositories/payment.repository.ts";
import * as userRepository from "../repositories/user.repository.ts";
import { enqueuePaymentReceipt } from "../queues/index.ts";
import { ConflictError, NotFoundError } from "../utils/errors.ts";

export async function payOrder(userId: number, orderId: number) {
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
      throw new ConflictError("Order is not payable");
    }

    const paymentId = await paymentRepository.insertPayment(
      {
        orderId: order.id,
        provider: "mock",
        providerRef: `mock_${order.id}_${crypto.randomUUID()}`,
        amount: order.total,
        status: "paid",
      },
      tx,
    );

    await orderRepository.updateStatus(order.id, "paid", tx);

    const payment = await paymentRepository.findById(paymentId, tx);
    const updatedOrder = await orderRepository.findById(order.id, tx);

    return { payment, order: updatedOrder };
  });

  const customer = await userRepository.findPublicById(userId);

  if (customer?.email && result.payment) {
    enqueuePaymentReceipt({
      to: customer.email,
      name: customer.name,
      orderId,
      amount: result.payment.amount,
    });
  }

  return result;
}
