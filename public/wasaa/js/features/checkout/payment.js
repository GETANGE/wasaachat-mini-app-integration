// Pays for a pending order through the WasaaChat wallet:
// prepare a reference on our server → ask WasaaChat to charge → poll until final.
import { FINAL_PAYMENT_STATUSES, PAYMENT_POLL_ATTEMPTS, PAYMENT_POLL_INTERVAL_MS } from "../../config.js";
import { api } from "../../core/api.js";
import { callBridge } from "../../core/bridge.js";
import { errorMessage } from "../../core/errors.js";
import { emit } from "../../core/events.js";
import { icons } from "../../ui/icons.js";
import { navigate } from "../../ui/router.js";
import { closeSheet, isSheetOpen, openSheet, updateSheet } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { delay } from "../../utils/async.js";
import { h } from "../../utils/dom.js";
import { payStatus } from "./payment-status.js";

async function pollPayment(intentId, onConfirmed) {
  let status = "pending";
  for (let attempt = 0; attempt < PAYMENT_POLL_ATTEMPTS; attempt++) {
    try {
      status = (await callBridge("getPayment", intentId)).status;
    } catch {
      /* transient bridge error — keep polling */
    }
    if (FINAL_PAYMENT_STATUSES.has(status)) return status;
    if (status === "confirmed") onConfirmed();
    await delay(PAYMENT_POLL_INTERVAL_MS);
  }
  return status;
}

export async function payForOrder(order) {
  const token = openSheet({
    title: `Order #${order.id}`,
    body: [payStatus({ amount: order.total, title: "Preparing payment…", step: 1 })],
    onClose: () => emit("orders:changed"),
  });

  const show = (view, foot = []) => updateSheet(token, { body: [view], foot });
  const viewOrders = () => {
    closeSheet();
    navigate("orders");
  };
  const button = (label, onClick, variant = "btn-primary") => h("button", { type: "button", class: `btn ${variant}`, onClick }, label);
  const single = (label, onClick) => [h("button", { type: "button", class: "btn btn-primary btn-block", onClick }, label)];
  const retryRow = (retryLabel) => [
    h("div", { class: "btn-row" }, button("View orders", viewOrders, "btn-ghost"), button(retryLabel, () => payForOrder(order))),
  ];

  let amount = order.total;
  let intentId;

  try {
    const payment = await api.preparePayment(order.id);
    amount = payment.amount;
    show(payStatus({ amount, title: "Confirm the payment in WasaaChat", detail: "Approve the request from your WasaaChat wallet to complete this order.", step: 1 }));

    ({ intent_id: intentId } = await callBridge("requestPayment", {
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      reference: payment.reference,
    }));
  } catch (error) {
    show(
      payStatus({ tone: "bad", icon: icons.cross(), amount, title: "Payment didn’t start", detail: `${errorMessage(error)} Your order is saved — you can pay for it from Orders.` }),
      retryRow("Try again"),
    );
    return;
  }

  show(payStatus({ amount, title: "Waiting for confirmation…", detail: "This usually takes a few seconds.", step: 1 }));

  const status = await pollPayment(intentId, () =>
    show(payStatus({ amount, title: "Almost done…", detail: "WasaaChat is settling your payment.", step: 2 })),
  );

  // If the shopper closed the sheet while we polled, tell them via a toast instead.
  const visible = isSheetOpen(token);

  switch (status) {
    case "paid":
      show(payStatus({ tone: "ok", icon: icons.check(), amount, title: "Payment received", detail: `Order #${order.id} is confirmed. We’ll let you know when it ships.`, step: 3 }), single("View my orders", viewOrders));
      if (!visible) toast(`Order #${order.id} paid`);
      break;
    case "declined":
      show(payStatus({ tone: "bad", icon: icons.cross(), amount, title: "Payment cancelled", detail: "You were not charged. Your order is waiting in Orders if you change your mind." }), retryRow("Pay again"));
      if (!visible) toast("Payment cancelled. You were not charged.", true);
      break;
    case "expired":
    case "failed":
      show(payStatus({ tone: "bad", icon: icons.cross(), amount, title: "Payment didn’t go through", detail: "You were not charged. You can try again from Orders." }), retryRow("Try again"));
      if (!visible) toast("Payment didn’t go through.", true);
      break;
    case "refunded":
      show(payStatus({ tone: "wait", icon: icons.clock(), amount, title: "Payment refunded", detail: "This payment was refunded to your wallet." }), single("View my orders", viewOrders));
      break;
    default:
      show(payStatus({ tone: "wait", icon: icons.clock(), amount, title: "Still confirming", detail: "We haven’t heard back yet. Your order will update automatically once WasaaChat confirms." }), single("View my orders", viewOrders));
  }
}
