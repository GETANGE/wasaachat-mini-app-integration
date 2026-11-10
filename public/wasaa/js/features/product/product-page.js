// Product detail page: gallery, buy box, details, and related products.
import { LOW_STOCK_THRESHOLD } from "../../config.js";
import { content } from "../../content.js";
import { api } from "../../core/api.js";
import { on } from "../../core/events.js";
import { state } from "../../state.js";
import { carousel } from "../../ui/carousel.js";
import { productIconName } from "../../ui/category-icon.js";
import { priceBlock, ratingStars, sectionHead, stepper, thumb } from "../../ui/components.js";
import { icon } from "../../ui/icons.js";
import { onEnter } from "../../ui/router.js";
import { $, h } from "../../utils/dom.js";
import { formatMoney } from "../../utils/format.js";
import { discountPercent, hasRating } from "../../utils/product.js";
import { addToCart } from "../cart/cart.js";
import { openCheckout } from "../checkout/checkout.js";
import { productCard } from "../shop/product-card.js";
import { isWishlisted, toggleWishlist } from "../wishlist/wishlist-store.js";

let current = null; // product on screen
let renderToken = 0;

const categoryOf = (product) => state.categories.find((c) => c.id === product.categoryId);

function imagesOf(product) {
  if (product.images?.length) return product.images;
  return product.image ? [{ url: product.image, alt: product.name }] : [null];
}

/* ---------- pieces ---------- */

function breadcrumb(product) {
  const category = categoryOf(product);
  const crumb = (label, data) => h("a", { href: "#", dataset: data }, label);
  return h(
    "nav",
    { class: "pdp-crumbs", "aria-label": "Breadcrumb" },
    h("button", { type: "button", class: "pdp-back", "aria-label": "Back", onClick: () => history.back() }, icon("chevronLeft", 18)),
    crumb("Home", { goto: "home" }),
    icon("chevronRight", 14),
    category ? crumb(category.name, { goto: "shop", category: category.slug }) : crumb("Shop", { goto: "shop" }),
    icon("chevronRight", 14),
    h("span", { "aria-current": "page" }, product.name),
  );
}

function gallery(product) {
  const images = imagesOf(product);
  const fallback = productIconName(product);
  const main = h("div", { class: "pdp-main-img" }, thumb(product.name, images[0]?.url, images[0]?.alt, fallback));
  const off = discountPercent(product);

  const thumbs =
    images.length > 1
      ? h(
          "div",
          { class: "pdp-thumbs", role: "tablist", "aria-label": "Product photos" },
          ...images.map((image, i) => {
            const button = h(
              "button",
              { type: "button", class: "pdp-thumb", role: "tab", "aria-selected": String(i === 0), "aria-label": `Photo ${i + 1}` },
              thumb(product.name, image?.url, image?.alt, fallback),
            );
            button.addEventListener("click", () => {
              main.replaceChildren(thumb(product.name, image?.url, image?.alt, fallback));
              for (const b of button.parentElement.children) b.setAttribute("aria-selected", String(b === button));
            });
            return button;
          }),
        )
      : null;

  return h(
    "div",
    { class: "pdp-gallery" },
    h("div", { class: "pdp-stage" }, main, off ? h("span", { class: "card-badge sale pdp-badge" }, `-${off}%`) : null),
    thumbs,
  );
}

function stockLine(product) {
  if (product.stock < 1) return h("p", { class: "pdp-stock out" }, h("span", { class: "dot-status" }), "Sold out");
  if (product.stock <= LOW_STOCK_THRESHOLD) return h("p", { class: "pdp-stock low" }, h("span", { class: "dot-status" }), `Only ${product.stock} left — order soon`);
  return h("p", { class: "pdp-stock" }, h("span", { class: "dot-status" }), "In stock, ready to ship");
}

function wishButton(product, extraClass = "") {
  const button = h(
    "button",
    {
      type: "button",
      class: `pdp-wish ${extraClass}`,
      "aria-label": "Save to wishlist",
      "aria-pressed": String(isWishlisted(product.id)),
      dataset: { wish: product.id },
    },
    icon("heart", 20),
  );
  button.addEventListener("click", () => toggleWishlist(product));
  return button;
}

function buyBox(product) {
  const inStock = product.stock > 0;
  const category = categoryOf(product);
  const off = discountPercent(product);
  let quantity = 1;

  const qty = stepper({ value: 1, max: Math.max(1, Math.min(product.stock, 99)), large: true, onChange: (v) => (quantity = v) });
  const add = h("button", { type: "button", class: "btn btn-primary pdp-add", disabled: !inStock }, icon("cart", 18), "Add to cart");
  const buy = h("button", { type: "button", class: "btn btn-sage pdp-buy", disabled: !inStock }, "Buy now");

  add.addEventListener("click", () => addToCart(product, quantity, add));
  // "Buy now" adds to the cart and checks out the whole cart.
  buy.addEventListener("click", async () => {
    if (await addToCart(product, quantity, buy)) openCheckout();
  });

  const saving = off ? h("span", { class: "pdp-saving" }, `You save ${formatMoney(Number(product.compareAtPrice) - Number(product.price))}`) : null;

  return h(
    "div",
    { class: "pdp-info" },
    category ? h("a", { href: "#", class: "pdp-category", dataset: { goto: "shop", category: category.slug } }, category.name) : null,
    h("h1", { class: "pdp-title" }, product.name),
    hasRating(product) ? h("div", { class: "pdp-rating" }, h("span", { class: "pdp-rating-value" }, Number(product.rating).toFixed(1)), ratingStars(product.rating, product.reviewCount, 16)) : null,
    h("div", { class: "pdp-price" }, priceBlock(product, { large: true })),
    saving,
    stockLine(product),
    product.description ? h("p", { class: "pdp-lead" }, product.description) : null,
    inStock
      ? h("div", { class: "pdp-actions" }, h("div", { class: "pdp-qty" }, h("span", { class: "pdp-label" }, "Quantity"), qty), h("div", { class: "pdp-buttons" }, add, buy, wishButton(product)))
      : h("div", { class: "pdp-actions" }, h("div", { class: "pdp-buttons" }, h("button", { type: "button", class: "btn btn-ghost", disabled: true }, "Sold out"), wishButton(product))),
    content.features.length
      ? h("ul", { class: "pdp-promises" }, ...content.features.slice(0, 3).map((f) => h("li", {}, icon(f.icon, 20), h("span", {}, h("strong", {}, f.title), f.text))))
      : null,
  );
}

function detailsSection(product) {
  const category = categoryOf(product);
  const rows = [
    ["Category", category?.name],
    ["SKU", product.sku],
    ["Availability", product.stock > 0 ? `${product.stock} in stock` : "Sold out"],
  ].filter(([, v]) => v);

  const panel = (title, body, open = false) => h("details", { class: "pdp-panel", open }, h("summary", {}, title, icon("chevronDown", 18)), h("div", { class: "pdp-panel-body" }, body));

  return h(
    "section",
    { class: "pdp-details panel" },
    // The description already leads the buy box, so the panels hold the rest.
    panel("Product details", h("dl", { class: "pdp-spec" }, ...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)])), true),
    content.productPage?.deliveryAndReturns ? panel("Delivery & returns", h("p", {}, content.productPage.deliveryAndReturns)) : null,
  );
}

// Fixed bar on phones so price + Add to cart are always reachable.
function mobileBar(product) {
  const inStock = product.stock > 0;
  const add = h("button", { type: "button", class: "btn btn-primary", disabled: !inStock }, inStock ? "Add to cart" : "Sold out");
  add.addEventListener("click", () => addToCart(product, 1, add));
  return h("div", { class: "pdp-bar" }, h("div", { class: "pdp-bar-price" }, priceBlock(product)), wishButton(product, "small"), add);
}

async function related(product, token) {
  const slot = h("section", { class: "panel pdp-related", hidden: true });
  const category = categoryOf(product);
  (async () => {
    try {
      // Same category first; top up from the whole shop when it's a small category.
      const { items } = await api.products({ limit: 12, category: category?.slug });
      let others = items.filter((p) => p.id !== product.id);
      if (others.length < 5 && category) {
        const { items: more } = await api.products({ limit: 12 });
        const seen = new Set([product.id, ...others.map((p) => p.id)]);
        others = [...others, ...more.filter((p) => !seen.has(p.id))];
      }
      others = others.slice(0, 10);
      if (token !== renderToken || !others.length) return;
      slot.replaceChildren(sectionHead("You may also like"), carousel(others.map(productCard), { label: "related products" }));
      slot.hidden = false;
    } catch {
      /* related products are optional */
    }
  })();
  return slot;
}

/* ---------- page ---------- */

async function render(product) {
  const token = ++renderToken;
  current = product;
  $("view-product").replaceChildren(
    breadcrumb(product),
    h("div", { class: "pdp" }, gallery(product), buyBox(product)),
    detailsSection(product),
    await related(product, token),
    mobileBar(product),
  );
}

function renderMissing() {
  current = null;
  $("view-product").replaceChildren(
    h(
      "div",
      { class: "empty-state" },
      h("p", { class: "empty-title" }, "This product isn’t available"),
      h("p", { class: "empty-detail" }, "It may have sold out or been removed from the shop."),
      h("a", { href: "#", class: "btn btn-primary", dataset: { goto: "shop" } }, "Browse products"),
    ),
  );
}

async function enter({ product, slug }) {
  if (product) render(product);
  const key = slug ?? product?.slug;
  if (!key) return renderMissing();
  try {
    // Fetch the latest price, stock and photos; re-render if anything changed.
    const { product: fresh } = await api.product(key);
    if (state.view === "product" && (current?.slug ?? key) === key && JSON.stringify(fresh) !== JSON.stringify(product)) {
      const y = window.scrollY;
      await render({ ...product, ...fresh });
      window.scrollTo({ top: y });
    }
  } catch (error) {
    if (error?.status === 404 && state.view === "product") renderMissing();
  }
}

export function initProductPage() {
  onEnter("product", enter);
  on("stock:changed", () => {
    if (state.view === "product" && current) enter({ product: current });
  });
}
