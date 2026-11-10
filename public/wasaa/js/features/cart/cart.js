import { api } from "../../core/api.js";
import { errorMessage, stockErrorMessage } from "../../core/errors.js";
import { state } from "../../state.js";
import { busy } from "../../ui/components.js";
import { onEnter } from "../../ui/router.js";
import { toast } from "../../ui/toast.js";
import { $ } from "../../utils/dom.js";
import { plural } from "../../utils/format.js";
import { renderCart } from "./cart-view.js";

const EMPTY_TOTALS = { items: [], itemCount: 0, subtotal: "0.00", shippingFee: "0.00", total: "0.00" };

// Stores the cart and refreshes everything that shows it (badges, header, cart view).
function setCart(cart) {
  state.cart = cart;
  const count = cart?.itemCount ?? 0;
  for (const badge of document.querySelectorAll("[data-cart-count]")) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  }
  $("header-cart").setAttribute("aria-label", count ? `Cart, ${plural(count, "item")}` : "Cart");
  $("cart-sub").textContent = count ? plural(count, "item") : "";
  if (state.view === "cart") renderCart(state.cart, cartActions);
}

export const clearCart = () => setCart({ ...state.cart, ...EMPTY_TOTALS });

// Returns the fresh cart, or null if it couldn't be loaded.
export async function loadCart() {
  try {
    const { cart } = await api.cart();
    setCart(cart);
    return cart;
  } catch (error) {
    toast(errorMessage(error), true);
    if (state.view === "cart") renderCart(state.cart, cartActions);
    return null;
  }
}

// Items that block checkout: deactivated products or quantity above stock.
export const cartProblems = (cart) => (cart?.items ?? []).filter((item) => !item.active || item.quantity > item.stock);

export async function addToCart(product, quantity, button) {
  const restore = button ? busy(button, button.classList.contains("add-btn") ? "" : undefined) : null;
  try {
    const { cart } = await api.addToCart(product.id, quantity);
    setCart(cart);
    toast(`${quantity > 1 ? `${quantity} × ` : ""}${product.name} added to cart`);
    return true;
  } catch (error) {
    toast(stockErrorMessage(error), true);
    return false;
  } finally {
    restore?.();
  }
}

const cartActions = {
  async setQuantity(productId, quantity) {
    try {
      const { cart } = await api.setCartQuantity(productId, quantity);
      setCart(cart);
    } catch (error) {
      toast(stockErrorMessage(error), true);
      renderCart(state.cart, cartActions);
    }
  },
  async remove(productId) {
    try {
      const { cart } = await api.removeFromCart(productId);
      setCart(cart);
      return true;
    } catch (error) {
      toast(errorMessage(error), true);
      return false;
    }
  },
  hasProblems: (cart) => cartProblems(cart).length > 0,
};

export function initCart() {
  onEnter("cart", loadCart);
}
