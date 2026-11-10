// Shop listing: all products, deals, new arrivals, a category, or search results.
import { PAGE_SIZE } from "../../config.js";
import { api } from "../../core/api.js";
import { errorMessage } from "../../core/errors.js";
import { emit, on } from "../../core/events.js";
import { state } from "../../state.js";
import { skeletons } from "../../ui/components.js";
import { onEnter } from "../../ui/router.js";
import { toast } from "../../ui/toast.js";
import { $, h } from "../../utils/dom.js";
import { plural } from "../../utils/format.js";
import { isDeal } from "../../utils/product.js";
import { productCard } from "./product-card.js";

let latestRequest = 0;
let loaded = false;

export async function loadCategories() {
  try {
    const { categories } = await api.categories();
    state.categories = categories ?? [];
  } catch {
    state.categories = [];
  }
  emit("categories:loaded");
  renderChips();
}

const categoryBySlug = (slug) => state.categories.find((c) => c.slug === slug);

function renderChips() {
  const root = $("shop-chips");
  if (state.categories.length < 2) {
    root.replaceChildren();
    return;
  }
  const chip = (label, slug) =>
    h(
      "button",
      {
        type: "button",
        class: "chip",
        "aria-pressed": String(state.category === slug),
        onClick: () => {
          if (state.category === slug) return;
          state.category = slug;
          renderChips();
          loadProducts({ reset: true });
        },
      },
      label,
    );
  root.replaceChildren(chip("All", ""), ...state.categories.map((c) => chip(c.name, c.slug)));
}

function heading() {
  if (state.search) return `Results for “${state.search}”`;
  if (state.category) return categoryBySlug(state.category)?.name ?? "Products";
  if (state.shopMode === "deals") return "Deals";
  if (state.shopMode === "new") return "New Arrivals";
  return "All Products";
}

const visibleProducts = () => (state.shopMode === "deals" ? state.products.filter(isDeal) : state.products);

function renderHeading() {
  $("shop-title").textContent = heading();
  const sub = $("shop-sub");
  if (state.shopMode === "deals") sub.textContent = "Discounted products, while they last.";
  else if (state.shopMode === "new") sub.textContent = "The latest additions to the shop.";
  else sub.textContent = loaded ? plural(state.total, "product") : "";
}

async function loadProducts({ reset = false } = {}) {
  const request = ++latestRequest;
  const isLatest = () => request === latestRequest;

  if (reset) {
    state.page = 1;
    state.products = [];
    loaded = false;
    $("products").replaceChildren(...skeletons(8));
    $("products-empty").hidden = true;
  }
  renderHeading();
  $("products").setAttribute("aria-busy", "true");
  $("load-more").disabled = true;

  try {
    const result = await api.products({
      page: state.page,
      limit: PAGE_SIZE,
      category: state.category || undefined,
      search: state.search || undefined,
    });
    if (!isLatest()) return;

    state.products = reset ? result.items : [...state.products, ...result.items];
    state.totalPages = result.totalPages;
    state.total = result.total;
    loaded = true;
    renderProducts();
  } catch (error) {
    if (!isLatest()) return;
    if (reset) $("products").replaceChildren();
    $("products-empty").textContent = "Could not load products. Try again.";
    $("products-empty").hidden = false;
    toast(errorMessage(error), true);
  } finally {
    if (isLatest()) {
      $("products").setAttribute("aria-busy", "false");
      $("load-more").disabled = false;
    }
  }
}

function emptyMessage() {
  if (state.search) return `Nothing matches “${state.search}”. Try another search.`;
  if (state.shopMode === "deals") return "No deals right now — check back soon.";
  if (state.category) return "No products in this category yet.";
  return "No products are available right now.";
}

function renderProducts() {
  const list = visibleProducts();
  $("products").replaceChildren(...list.map(productCard));
  renderHeading();

  const empty = $("products-empty");
  empty.hidden = list.length > 0;
  if (!empty.hidden) empty.textContent = emptyMessage();

  $("load-more").hidden = state.page >= state.totalPages;
}

function applyParams(params) {
  let changed = !loaded;
  for (const [key, field] of [["mode", "shopMode"], ["category", "category"], ["search", "search"]]) {
    if (params[key] !== undefined && params[key] !== state[field]) {
      state[field] = params[key];
      changed = true;
    }
  }
  $("search").value = state.search;
  renderChips();
  if (changed) loadProducts({ reset: true });
  else renderHeading();
}

export function initCatalog() {
  onEnter("shop", applyParams);
  $("load-more").addEventListener("click", () => {
    state.page += 1;
    loadProducts();
  });
  on("stock:changed", () => {
    if (loaded) loadProducts({ reset: true });
  });
}
