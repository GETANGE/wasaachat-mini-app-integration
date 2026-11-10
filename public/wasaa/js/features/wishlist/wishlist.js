import { api } from "../../core/api.js";
import { on } from "../../core/events.js";
import { state } from "../../state.js";
import { onEnter } from "../../ui/router.js";
import { $ } from "../../utils/dom.js";
import { plural } from "../../utils/format.js";
import { productCard } from "../shop/product-card.js";
import { replaceWishlist, wishlistItems } from "./wishlist-store.js";

function render() {
  const items = wishlistItems();
  $("wishlist-sub").textContent = items.length ? plural(items.length, "saved item") : "";
  $("wishlist-items").replaceChildren(...items.map(productCard));
  $("wishlist-empty").hidden = items.length > 0;
}

// Saved snapshots can go stale (price, stock, product removed). Re-fetch them
// when the page opens and drop anything no longer sold.
async function refresh() {
  const items = wishlistItems();
  if (!items.length) return;
  const results = await Promise.allSettled(items.map((item) => api.product(item.slug)));
  const fresh = results.flatMap((result, i) => {
    if (result.status === "fulfilled") return [result.value.product];
    return result.reason?.status === 404 ? [] : [items[i]];
  });
  replaceWishlist(fresh);
}

export function initWishlist() {
  onEnter("wishlist", () => {
    render();
    refresh();
  });
  on("wishlist:changed", () => state.view === "wishlist" && render());
}
