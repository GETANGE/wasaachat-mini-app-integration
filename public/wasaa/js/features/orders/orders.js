// Orders tab: list of the shopper's orders.
import { api } from "../../core/api.js";
import { errorMessage } from "../../core/errors.js";
import { on } from "../../core/events.js";
import { state } from "../../state.js";
import { skeletons, statusPill } from "../../ui/components.js";
import { onEnter } from "../../ui/router.js";
import { toast } from "../../ui/toast.js";
import { $, h } from "../../utils/dom.js";
import { formatDate, formatMoney } from "../../utils/format.js";
import { openOrder } from "./order-sheet.js";

async function loadOrders() {
  if (!state.orders) $("orders").replaceChildren(...skeletons(3, "skeleton row"));

  try {
    const { orders } = await api.orders();
    state.orders = orders;
  } catch (error) {
    toast(errorMessage(error), true);
    state.orders ??= [];
  }
  if (state.view === "orders") renderOrders();
}

function itemSummary(items) {
  if (!items?.length) return "";
  const [first, ...rest] = items;
  const head = `${first.quantity} × ${first.productName}`;
  return rest.length ? `${head} and ${rest.length} more` : head;
}

function orderCard(order) {
  return h(
    "button",
    { type: "button", class: "card order-card", onClick: () => openOrder(order) },
    h("div", { class: "order-head" }, h("span", { class: "order-id" }, `Order #${order.id}`), statusPill(order.status)),
    h("span", { class: "order-items" }, itemSummary(order.items)),
    h("div", { class: "order-foot" }, h("span", { class: "line-sub" }, formatDate(order.createdAt)), h("strong", {}, formatMoney(order.total))),
  );
}

function renderOrders() {
  const orders = state.orders ?? [];
  $("orders-empty").hidden = orders.length > 0;
  $("orders").replaceChildren(...orders.map(orderCard));
}

export function initOrders() {
  onEnter("orders", loadOrders);
  on("orders:changed", () => {
    state.orders = null;
    if (state.view === "orders") loadOrders();
  });
}
