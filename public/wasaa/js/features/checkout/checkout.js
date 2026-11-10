import { api } from "../../core/api.js";
import { canPay } from "../../core/bridge.js";
import { errorMessage } from "../../core/errors.js";
import { emit } from "../../core/events.js";
import { loadAddress, saveAddress } from "../../core/storage.js";
import { state } from "../../state.js";
import { busy, miniLines, sectionLabel, totalsList } from "../../ui/components.js";
import { navigate } from "../../ui/router.js";
import { closeSheet, openSheet } from "../../ui/sheet.js";
import { toast } from "../../ui/toast.js";
import { $, h } from "../../utils/dom.js";
import { formatMoney } from "../../utils/format.js";
import { cartProblems, clearCart, loadCart } from "../cart/cart.js";
import { addressForm, readAddress, validateAddressForm } from "./address-form.js";
import { payForOrder } from "./payment.js";

export async function openCheckout() {
  const cart = await loadCart();
  if (!cart) return;

  if (!cart.items.length || cartProblems(cart).length) {
    closeSheet();
    navigate("cart");
    if (cart.items.length) toast("Fix the highlighted items in your cart first.", true);
    return;
  }

  const form = addressForm("checkout-form", loadAddress());
  const payable = canPay();
  const payBtn = h(
    "button",
    { type: "submit", form: "checkout-form", class: "btn btn-primary btn-block", disabled: !payable },
    `Pay ${formatMoney(cart.total)}`,
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstInvalid = validateAddressForm(form);
    if (firstInvalid) {
      firstInvalid.focus();
      toast("Fill in the highlighted fields.", true);
      return;
    }

    const address = readAddress(form);
    saveAddress({ ...address, line2: address.line2 ?? "", region: address.region ?? "" });
    const restore = busy(payBtn, "Placing order…");

    try {
      const { order } = await api.checkout(address);
      clearCart();
      emit("stock:changed");
      emit("orders:changed");
      payForOrder(order);
    } catch (error) {
      restore();
      toast(errorMessage(error), true);
      if (error?.status === 409 || error?.status === 400) loadCart();
    }
  });

  openSheet({
    title: "Checkout",
    body: [
      sectionLabel("Deliver to"),
      form,
      sectionLabel("Your order"),
      miniLines(cart.items.map((item) => ({ label: `${item.quantity} × ${item.name}`, amount: item.lineTotal }))),
      totalsList(cart),
      payable
        ? null
        : h(
            "div",
            { class: "notice" },
            state.mode === "web"
              ? "Payments happen in the WasaaChat app. Open VIVA in WasaaChat to pay — your cart is waiting there."
              : "Payments aren’t enabled for this app yet. Allow the payment permission in WasaaChat, then reopen the shop.",
          ),
    ].filter(Boolean),
    foot: [payBtn],
  });
}

export function initCheckout() {
  $("cart-checkout").addEventListener("click", openCheckout);
}
