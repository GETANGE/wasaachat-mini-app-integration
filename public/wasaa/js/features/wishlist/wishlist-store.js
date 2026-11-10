// Device-local wishlist. Stores a small snapshot of each product so the
// wishlist page can render instantly; it refreshes from the API when opened.
import { emit, on } from "../../core/events.js";
import { loadWishlist, saveWishlist } from "../../core/storage.js";
import { productImage } from "../../utils/product.js";

let items = loadWishlist();

export const wishlistItems = () => items;
export const isWishlisted = (productId) => items.some((item) => item.id === productId);

const snapshot = (product) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  rating: product.rating ?? null,
  reviewCount: product.reviewCount ?? null,
  stock: product.stock,
  image: productImage(product),
});

function commit(next) {
  items = next;
  saveWishlist(items);
  emit("wishlist:changed");
}

// Returns true when the product is now saved.
export function toggleWishlist(product) {
  if (isWishlisted(product.id)) {
    commit(items.filter((item) => item.id !== product.id));
    return false;
  }
  commit([snapshot(product), ...items]);
  return true;
}

export function replaceWishlist(products) {
  commit(products.map(snapshot));
}

function syncHearts() {
  for (const button of document.querySelectorAll("[data-wish]")) {
    const saved = isWishlisted(Number(button.dataset.wish));
    button.setAttribute("aria-pressed", String(saved));
  }
  const count = items.length;
  for (const badge of document.querySelectorAll("[data-wishlist-count]")) {
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  }
}

export function initWishlistStore() {
  on("wishlist:changed", syncHearts);
  syncHearts();
}
