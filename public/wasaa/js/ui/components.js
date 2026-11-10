// Small reusable view pieces shared by several features.
import { h } from "../utils/dom.js";
import { formatMoney, initials, toneFor } from "../utils/format.js";
import { icon, star } from "./icons.js";

// Product image. When there is no image (or it fails to load) it shows a quiet
// placeholder: the given icon, or the product's initials if no icon is given.
export function thumb(name, url, alt, fallbackIcon) {
  const box = h("div", { class: "thumb", dataset: { tone: toneFor(name) } });
  const fallback = () => {
    box.classList.add("is-placeholder");
    box.replaceChildren(fallbackIcon ? icon(fallbackIcon, 40) : initials(name));
  };

  if (url) {
    const img = h("img", { src: url, alt: alt ?? name, loading: "lazy", decoding: "async" });
    img.addEventListener("error", fallback, { once: true });
    box.append(img);
  } else {
    fallback();
  }
  return box;
}

export function stepper({ value, min = 1, max = 99, onChange, large = false, label = "Quantity" }) {
  const output = h("output", { "aria-live": "polite" }, value);
  const minus = h("button", { type: "button", "aria-label": `Decrease ${label.toLowerCase()}` }, "−");
  const plus = h("button", { type: "button", "aria-label": `Increase ${label.toLowerCase()}` }, "+");
  const root = h("div", { class: `stepper${large ? " lg" : ""}`, role: "group", "aria-label": label }, minus, output, plus);

  let current = value;
  const sync = () => {
    output.textContent = current;
    minus.disabled = current <= min;
    plus.disabled = current >= max;
  };
  const set = (next) => {
    if (next < min || next > max || next === current) return;
    current = next;
    sync();
    onChange?.(current);
  };

  minus.addEventListener("click", () => set(current - 1));
  plus.addEventListener("click", () => set(current + 1));
  sync();

  root.setDisabled = (disabled) => {
    minus.disabled = disabled || current <= min;
    plus.disabled = disabled || current >= max;
  };
  return root;
}

// Puts a button into a loading state; returns a function that restores it.
export function busy(button, label) {
  const original = [...button.childNodes];
  button.disabled = true;
  button.replaceChildren(h("span", { class: "spinner" }), label ?? button.textContent);
  return () => {
    button.disabled = false;
    button.replaceChildren(...original);
  };
}

export const statusPill = (status) => h("span", { class: "pill", dataset: { status } }, status);

export function totalsList({ subtotal, shippingFee, total }) {
  const shipping = Number(shippingFee) === 0 ? h("span", { class: "free" }, "Free") : formatMoney(shippingFee);
  return h(
    "dl",
    { class: "totals" },
    h("div", {}, h("dt", {}, "Subtotal"), h("dd", {}, formatMoney(subtotal))),
    h("div", {}, h("dt", {}, "Delivery"), h("dd", {}, shipping)),
    h("div", { class: "total" }, h("dt", {}, "Total"), h("dd", {}, formatMoney(total))),
  );
}

// "2 × Name ........ Ksh 200" rows.
export const miniLines = (rows) =>
  h("div", { class: "mini-lines" }, ...rows.map(({ label, amount }) => h("div", {}, h("span", {}, label), h("span", {}, formatMoney(amount)))));

export const sectionLabel = (text) => h("p", { class: "section-label" }, text);

export function field({ name, label, value = "", required = false, autocomplete, hint, maxlength, inputmode }) {
  return h(
    "label",
    { class: "field" },
    h("span", {}, label, hint ? h("span", { class: "hint" }, ` · ${hint}`) : null),
    h("input", { name, value, required, autocomplete, maxlength, inputmode }),
  );
}

export function addressBlock(address) {
  if (!address) return null;
  const lines = [
    address.line1,
    address.line2,
    [address.city, address.region].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(" "),
  ].filter(Boolean);
  return h("address", { class: "address" }, ...lines.flatMap((line, i) => (i ? [h("br"), line] : [line])));
}

export const skeletons = (count, className = "skeleton") =>
  Array.from({ length: count }, () => h("div", { class: className, "aria-hidden": "true" }));

// ★★★★☆ (1,234) — callers only use this when the product actually has a rating.
export function ratingStars(rating, count, size = 13) {
  const value = Number(rating);
  const stars = Array.from({ length: 5 }, (_, i) => star(value - i, size));
  return h(
    "span",
    { class: "rating", "aria-label": `Rated ${value.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}` },
    h("span", { class: "stars", "aria-hidden": "true" }, ...stars),
    count ? h("span", { class: "rating-count", "aria-hidden": "true" }, `(${Number(count).toLocaleString("en-KE")})`) : null,
  );
}

// Price with the compare-at price struck through when the product is discounted.
export function priceBlock(product, { large = false } = {}) {
  const discounted = Number(product.compareAtPrice) > Number(product.price);
  return h(
    "span",
    { class: `price${large ? " lg" : ""}` },
    h("span", { class: "price-now" }, formatMoney(product.price)),
    discounted ? h("s", { class: "price-was" }, formatMoney(product.compareAtPrice)) : null,
  );
}

// Section heading with an optional trailing ornament icon and a right-side action.
export function sectionHead(title, action, ornament) {
  return h(
    "div",
    { class: "section-head" },
    h("h2", { class: "section-title" }, title, ornament ? h("span", { class: `title-ornament ${ornament}` }, icon(ornament === "sparkle" ? "sparkle" : "heartFill", 18)) : null),
    action ?? null,
  );
}
