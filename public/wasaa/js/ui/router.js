// Client-side navigation between the storefront views.
//
// A "route" is what links point at (data-goto="deals"); each route maps to a
// view plus parameters. Features register what happens when their view is
// shown via onEnter(view, (params) => …), so the router never imports them.
//
// Every navigation is a browser history entry, so the device back button /
// gesture returns to the previous view instead of leaving the shop.
import { emit } from "../core/events.js";
import { state } from "../state.js";

const RESET_FILTERS = { category: "", search: "" };

export const ROUTES = {
  home: { view: "home" },
  shop: { view: "shop", params: { mode: "all", ...RESET_FILTERS } },
  deals: { view: "shop", params: { mode: "deals", ...RESET_FILTERS } },
  new: { view: "shop", params: { mode: "new", ...RESET_FILTERS } },
  product: { view: "product" },
  wishlist: { view: "wishlist" },
  cart: { view: "cart" },
  orders: { view: "orders" },
};

const enterHooks = new Map();
const scrollPositions = new Map();
let historyIndex = 0;

export function onEnter(view, hook) {
  enterHooks.set(view, hook);
}

function markActive(route) {
  for (const el of document.querySelectorAll("[data-goto]")) {
    if (!el.matches(".nav-link, .tab")) continue;
    if (el.dataset.goto === route) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  }
}

function show(route, params, { scrollTo = 0 } = {}) {
  const target = ROUTES[route] ?? ROUTES.home;
  state.view = target.view;
  state.route = route;
  document.body.dataset.view = target.view;
  for (const el of document.querySelectorAll("[data-view]")) el.hidden = el.dataset.view !== target.view;
  markActive(route);
  enterHooks.get(target.view)?.(params);
  window.scrollTo({ top: scrollTo });
  emit("route:changed", { route, view: target.view });
}

// navigate("deals") or navigate("shop", { category: "fashion" })
// Options: { replace: true } swaps the current history entry instead of adding one.
export function navigate(route, extra = {}, { replace = false } = {}) {
  const target = ROUTES[route] ?? ROUTES.home;
  const params = { ...(target.params ?? {}), ...extra };

  scrollPositions.set(historyIndex, window.scrollY);
  if (replace) {
    history.replaceState({ route, params, index: historyIndex }, "");
  } else {
    historyIndex += 1;
    history.pushState({ route, params, index: historyIndex }, "");
  }
  show(route, params);
}

export function back(fallback = "home") {
  if (historyIndex > 0) history.back();
  else navigate(fallback, {}, { replace: true });
}

export function initRouter() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-goto]");
    if (!link) return;
    event.preventDefault();
    const extra = link.dataset.category !== undefined ? { category: link.dataset.category } : {};
    navigate(link.dataset.goto, extra);
  });

  window.addEventListener("popstate", (event) => {
    const entry = event.state;
    if (!entry?.route) return;
    scrollPositions.set(historyIndex, window.scrollY);
    historyIndex = entry.index ?? 0;
    show(entry.route, entry.params ?? {}, { scrollTo: scrollPositions.get(historyIndex) ?? 0 });
  });
}
