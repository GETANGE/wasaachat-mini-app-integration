import { stepper, thumb } from "../../ui/components.js";
import { $, h } from "../../utils/dom.js";
import { formatMoney } from "../../utils/format.js";

// Pure rendering for the Cart tab. `actions` comes from cart.js:
//   setQuantity(productId, qty), remove(productId) → bool, hasProblems(cart) → bool
export function renderCart(cart, actions) {
  const items = cart?.items ?? [];
  $("cart-empty").hidden = items.length > 0 || !cart;
  $("cart-summary").hidden = items.length === 0;
  $("cart-items").replaceChildren(...items.map((item) => cartLine(item, actions)));

  if (cart && items.length) {
    const freeShipping = Number(cart.shippingFee) === 0;
    $("cart-subtotal").textContent = formatMoney(cart.subtotal);
    $("cart-shipping").textContent = freeShipping ? "Free" : formatMoney(cart.shippingFee);
    $("cart-shipping").classList.toggle("free", freeShipping);
    $("cart-total").textContent = formatMoney(cart.total);
    $("cart-checkout").disabled = actions.hasProblems(cart);
  }
}

function cartLine(item, actions) {
  const unavailable = !item.active;
  const short = item.active && item.quantity > item.stock;

  const qty = stepper({
    value: item.quantity,
    max: Math.max(item.quantity, Math.min(item.stock, 99)),
    onChange: (value) => {
      qty.setDisabled(true);
      actions.setQuantity(item.productId, value);
    },
  });

  const remove = h("button", { type: "button", class: "link-btn" }, "Remove");
  remove.addEventListener("click", async () => {
    remove.disabled = true;
    if (!(await actions.remove(item.productId))) remove.disabled = false;
  });

  const note = unavailable
    ? h("p", { class: "warn-text" }, "No longer available — remove to continue")
    : short
      ? h("p", { class: "warn-text" }, `Only ${item.stock} left — reduce quantity`)
      : h("p", { class: "line-sub" }, `${formatMoney(item.price)} each`);

  return h(
    "article",
    { class: "card line-item" },
    thumb(item.name, item.image, item.name, "bag"),
    h(
      "div",
      { class: "line-main" },
      h("div", { class: "line-top" }, h("p", { class: "line-name" }, item.name), remove),
      note,
      h("div", { class: "line-bottom" }, unavailable ? h("span") : qty, h("span", { class: "line-total" }, formatMoney(item.lineTotal))),
    ),
  );
}
