import { api } from "../../core/api.js";
import { canPay } from "../../core/bridge.js";
import { errorMessage } from "../../core/errors.js";
import { emit } from "../../core/events.js";
import { addressBlock, busy, miniLines, sectionLabel, statusPill, totalsList } from "../../ui/components.js";
import { closeSheet, openSheet } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { h } from "../../utils/dom.js";
import { formatDate } from "../../utils/format.js";
import { payForOrder } from "../checkout/payment.js";

const STATUS_NOTES = {
  pending: "Awaiting payment. Stock is held for you until you pay or cancel.",
  paid: "Paid — we’re preparing your order.",
  shipped: "On its way to you.",
  delivered: "Delivered. Enjoy!",
  cancelled: "This order was cancelled.",
  refunded: "This order was refunded to your WasaaChat wallet.",
};

// Cancel needs a second tap within 3s to confirm.
function cancelButton(order) {
  const button = h("button", { type: "button", class: "btn btn-danger" }, "Cancel order");
  let armed = false;

  button.addEventListener("click", async () => {
    if (!armed) {
      armed = true;
      button.textContent = "Tap to confirm";
      setTimeout(() => {
        armed = false;
        if (!button.disabled) button.textContent = "Cancel order";
      }, 3000);
      return;
    }

    const restore = busy(button, "Cancelling…");
    try {
      await api.cancelOrder(order.id);
      toast(`Order #${order.id} cancelled`);
      closeSheet();
      emit("orders:changed");
      emit("stock:changed");
    } catch (error) {
      restore();
      toast(errorMessage(error), true);
    }
  });

  return button;
}

export function openOrder(order) {
  const foot = [];
  if (order.status === "pending") {
    const pay = h("button", { type: "button", class: "btn btn-primary", disabled: !canPay(), onClick: () => payForOrder(order) }, "Pay now");
    foot.push(h("div", { class: "btn-row" }, cancelButton(order), pay));
  }

  const note = STATUS_NOTES[order.status];

  openSheet({
    title: `Order #${order.id}`,
    body: [
      h("div", { class: "detail-meta" }, statusPill(order.status), h("span", { class: "line-sub" }, formatDate(order.createdAt))),
      note ? h("p", { class: "detail-desc" }, note) : null,
      sectionLabel("Items"),
      miniLines((order.items ?? []).map((item) => ({ label: `${item.quantity} × ${item.productName}`, amount: Number(item.unitPrice) * item.quantity }))),
      totalsList(order),
      sectionLabel("Delivery address"),
      addressBlock(order.shippingAddress),
    ].filter(Boolean),
    foot,
  });
}
