import { LOW_STOCK_THRESHOLD } from "../../config.js";
import { priceBlock, ratingStars, thumb } from "../../ui/components.js";
import { productIconName } from "../../ui/category-icon.js";
import { icon } from "../../ui/icons.js";
import { h } from "../../utils/dom.js";
import { discountPercent, hasRating, productImage } from "../../utils/product.js";
import { addToCart } from "../cart/cart.js";
import { isWishlisted, toggleWishlist } from "../wishlist/wishlist-store.js";
import { navigate } from "../../ui/router.js";

function wishlistButton(product, className = "wish-btn") {
  const button = h(
    "button",
    {
      type: "button",
      class: className,
      "aria-label": `Save ${product.name} to wishlist`,
      "aria-pressed": String(isWishlisted(product.id)),
      dataset: { wish: product.id },
    },
    icon("heart", 18),
  );
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleWishlist(product);
  });
  return button;
}

function badge(product) {
  if (product.stock < 1) return h("span", { class: "card-badge out" }, "Sold out");
  const off = discountPercent(product);
  if (off) return h("span", { class: "card-badge sale" }, `-${off}%`);
  if (product.stock <= LOW_STOCK_THRESHOLD) return h("span", { class: "card-badge low" }, `Only ${product.stock} left`);
  return null;
}

export function productCard(product) {
  const add = h(
    "button",
    { type: "button", class: "card-cart", "aria-label": `Add ${product.name} to cart`, disabled: product.stock < 1 },
    icon("cart", 18),
  );
  add.addEventListener("click", (event) => {
    event.stopPropagation();
    addToCart(product, 1, add);
  });

  return h(
    "article",
    { class: "product-card" },
    h("div", { class: "card-media" }, thumb(product.name, productImage(product), product.images?.[0]?.alt, productIconName(product)), badge(product), wishlistButton(product)),
    h(
      "div",
      { class: "card-body" },
      h("h3", { class: "card-name" }, product.name),
      hasRating(product) ? ratingStars(product.rating, product.reviewCount) : null,
      h("div", { class: "card-foot" }, priceBlock(product), add),
    ),
    h("button", { type: "button", class: "card-open", "aria-label": `View ${product.name}`, onClick: () => navigate("product", { product }) }),
  );
}
