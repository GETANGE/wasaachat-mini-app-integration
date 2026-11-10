import { content } from "../content.js";
import { on } from "../core/events.js";
import { state } from "../state.js";
import { categoryIcon } from "../ui/category-icon.js";
import { icon } from "../ui/icons.js";
import { navigate } from "../ui/router.js";
import { debounce } from "../utils/async.js";
import { $, h } from "../utils/dom.js";

export function brandMark(size = 34) {
  return h(
    "span",
    { class: "brand" },
    h("span", { class: "brand-icon", "aria-hidden": "true" }, icon("logo", size * 1.15)),
    h("span", { class: "brand-text" }, h("span", { class: "brand-name" }, content.brand.name), h("span", { class: "brand-tagline" }, content.brand.tagline)),
  );
}

function renderAnnouncements() {
  const root = $("announce");
  root.hidden = content.announcements.length === 0;
  root.replaceChildren(
    h(
      "div",
      { class: "container announce-row" },
      ...content.announcements.map((item) => h("span", { class: "announce-item" }, icon(item.icon, 15), item.text)),
    ),
  );
}

function renderNav() {
  $("main-nav").replaceChildren(
    ...content.nav.map((item) => h("a", { href: "#", class: "nav-link", dataset: { goto: item.goto } }, item.label)),
  );
}

function renderCategoryMenu() {
  const menu = $("cat-menu");
  menu.replaceChildren(
    ...state.categories.map((category) =>
      h("a", { href: "#", class: "cat-menu-item", role: "menuitem", dataset: { goto: "shop", category: category.slug } }, categoryIcon(category, 20), category.name),
    ),
    h("a", { href: "#", class: "cat-menu-item all", role: "menuitem", dataset: { goto: "shop" } }, icon("grid", 20), "View all products"),
  );
}

function initCategoryMenu() {
  const toggle = $("cat-toggle");
  const menu = $("cat-menu");
  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(menu.hidden);
  });
  menu.addEventListener("click", () => setOpen(false));
  document.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  on("categories:loaded", renderCategoryMenu);
}

// The search box reflects the shop's search; clear it elsewhere.
function syncSearchBox({ view }) {
  if (view !== "shop") $("search").value = "";
}

function initSearch() {
  const input = $("search");
  const run = () => {
    const value = input.value.trim();
    if (state.view === "shop" && value === state.search) return;
    navigate("shop", { search: value });
  };
  const live = debounce(() => {
    if (state.view === "shop") run();
  }, 400);

  input.addEventListener("input", live);
  $("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    live.cancel();
    run();
    input.blur();
  });
}

// Shows the signed-in shopper's first name on the Account button.
export function setAccountName(name) {
  const label = document.querySelector('.header-actions [data-goto="orders"] .action-label');
  const first = String(name ?? "").trim().split(/\s+/)[0];
  if (label) label.textContent = first && name !== "WasaaChat customer" ? first : "Account";
}

export function initHeader() {
  $("header-brand").replaceChildren(brandMark());
  renderAnnouncements();
  renderNav();
  initCategoryMenu();
  initSearch();
  on("route:changed", syncSearchBox);
}
