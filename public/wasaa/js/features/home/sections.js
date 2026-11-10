// Home page sections. Each returns a node (or null when it has nothing real to show).
import { content } from "../../content.js";
import { state } from "../../state.js";
import { carousel } from "../../ui/carousel.js";
import { categoryIcon } from "../../ui/category-icon.js";
import { ratingStars, sectionHead } from "../../ui/components.js";
import { icon, star } from "../../ui/icons.js";
import { h } from "../../utils/dom.js";
import { initials, toneFor } from "../../utils/format.js";
import { isDeal, productImage } from "../../utils/product.js";
import { productCard } from "../shop/product-card.js";

const link = (label, goto, extra = {}) =>
  h("a", { href: "#", class: "text-link", dataset: { goto, ...extra } }, label, icon("arrowRight", 15));

const categoryExists = (slug) => slug && state.categories.some((c) => c.slug === slug);

/* ---------- hero ---------- */

const heroPlaceholder = () => h("div", { class: "hero-media placeholder" }, h("span", { class: "hero-glyph" }, icon("bag", 96)));

// Image that removes itself if it fails to load, calling onGone afterwards.
function fallibleImg(attrs, onGone) {
  const img = h("img", attrs);
  img.addEventListener("error", () => {
    const parent = img.parentElement;
    img.remove();
    onGone?.(parent);
  }, { once: true });
  return img;
}

function collage(photos) {
  const box = h("div", { class: `hero-media collage n${photos.length}` });
  const relayout = (el) => {
    const left = el.querySelectorAll("img").length;
    if (left === 0) el.replaceWith(heroPlaceholder());
    else el.className = `hero-media collage n${left}`;
  };
  box.append(...photos.map((src) => fallibleImg({ src, alt: "", class: "collage-photo" }, relayout)));
  return box;
}

function productPhotos() {
  return (state.picks ?? []).map(productImage).filter(Boolean).slice(0, 3);
}

function heroMedia(slide) {
  if (slide.image) {
    // If the configured hero photo fails, fall back to product photos.
    const box = h("div", { class: "hero-media" });
    box.append(fallibleImg({ src: slide.image, alt: "", class: "hero-photo" }, (el) => {
      const photos = productPhotos();
      el.replaceWith(photos.length ? collage(photos) : heroPlaceholder());
    }));
    return box;
  }
  const photos = productPhotos();
  return photos.length ? collage(photos) : heroPlaceholder();
}

function heroBadge(badge) {
  if (!badge) return null;
  return h(
    "div",
    { class: "hero-badge" },
    h("span", { class: "hb-eyebrow" }, badge.eyebrow),
    h("span", { class: "hb-lead" }, badge.lead),
    h("span", { class: "hb-value" }, badge.value),
    h("span", { class: "hb-suffix" }, badge.suffix),
  );
}

export function hero() {
  const { slides, trust } = content.hero;
  let index = 0;

  const slideNode = (slide) =>
    h(
      "div",
      { class: "hero-slide" },
      h(
        "div",
        { class: "hero-copy" },
        h("h1", { class: "hero-title" }, slide.title),
        h("p", { class: "hero-text" }, slide.text),
        slide.cta ? h("a", { href: "#", class: "btn btn-primary hero-cta", dataset: { goto: slide.cta.goto } }, slide.cta.label, icon("arrowRight", 16)) : null,
        trust?.length ? h("ul", { class: "trust" }, ...trust.map((t) => h("li", {}, icon(t.icon, 18), t.label))) : null,
      ),
      heroMedia(slide),
      heroBadge(slide.badge),
    );

  const stage = h("div", { class: "hero-stage" }, slideNode(slides[0]));
  const root = h("section", { class: "hero-wrap", "aria-label": "Featured" }, h("div", { class: "hero" }, stage));

  if (slides.length > 1) {
    const dots = h(
      "div",
      { class: "hero-dots" },
      ...slides.map((_, i) => h("button", { type: "button", class: "dot", "aria-label": `Slide ${i + 1}`, "aria-current": String(i === 0), onClick: () => show(i) })),
    );
    const show = (i) => {
      index = (i + slides.length) % slides.length;
      stage.replaceChildren(slideNode(slides[index]));
      [...dots.children].forEach((dot, d) => dot.setAttribute("aria-current", String(d === index)));
    };
    root.append(dots);
    const timer = setInterval(() => (root.isConnected ? show(index + 1) : clearInterval(timer)), 6000);
  }
  return root;
}

/* ---------- categories ---------- */

export function categoryRow() {
  const cats = state.categories.slice(0, 8);
  if (!cats.length) return null;
  const item = (label, iconNode, data) =>
    h("a", { href: "#", class: "cat-circle", dataset: data }, h("span", { class: "cat-circle-icon" }, iconNode), h("span", { class: "cat-circle-label" }, label));
  return h(
    "section",
    { class: "card-section cat-row", "aria-label": "Shop by category" },
    ...cats.map((c, i) => item(c.name, categoryIcon(c, 28), { goto: "shop", category: c.slug, tone: String((i % 8) + 1) })),
    item("View All", icon("grid", 24), { goto: "shop", tone: "all" }),
  );
}

/* ---------- top picks ---------- */

export function topPicks() {
  const picks = state.picks;
  const action = picks?.some(isDeal) ? link("See All Deals", "deals") : link("View All", "shop");
  const body = picks === null
    ? h("div", { class: "picks-loading" }, ...Array.from({ length: 5 }, () => h("div", { class: "skeleton" })))
    : picks.length
      ? carousel(picks.map(productCard), { label: "top picks", className: "picks" })
      : h("p", { class: "empty" }, "No products yet — check back soon.");
  return h("section", { class: "card-section panel" }, sectionHead("Top Picks For You", action, "sparkle"), body);
}

/* ---------- promos ---------- */

function promoImage(promo) {
  if (promo.image) return promo.image;
  const inCategory = (state.picks ?? []).find((p) => p.categoryId === state.categories.find((c) => c.slug === promo.category)?.id && productImage(p));
  return inCategory ? productImage(inCategory) : null;
}

export function promos() {
  if (!content.promos.length) return null;
  return h(
    "section",
    { class: "promos", "aria-label": "Promotions" },
    ...content.promos.map((promo) => {
      const data = { goto: promo.goto, tone: promo.tone };
      if (categoryExists(promo.category)) data.category = promo.category;
      const image = promoImage(promo);
      return h(
        "a",
        { href: "#", class: "promo", dataset: data },
        h(
          "div",
          { class: "promo-copy" },
          h("span", { class: "promo-eyebrow" }, promo.eyebrow),
          h("span", { class: "promo-title" }, promo.title),
          h("span", { class: "text-link" }, promo.cta, icon("arrowRight", 15)),
        ),
        image
          ? fallibleImg({ class: "promo-img", src: image, alt: "", loading: "lazy" }, (el) => el.append(h("span", { class: "promo-glyph" }, icon("bag", 56))))
          : h("span", { class: "promo-glyph" }, icon("bag", 56)),
      );
    }),
  );
}

/* ---------- testimonials ---------- */

export function testimonials() {
  const list = content.testimonials;
  if (!list.length) return null;
  const summary = content.ratingSummary
    ? h("span", { class: "rating-summary" }, `${content.ratingSummary.value}/5 ${content.ratingSummary.label}`, h("span", { class: "stars" }, ...Array.from({ length: 5 }, (_, i) => star(content.ratingSummary.value - i, 14))))
    : null;

  const cards = list.map((t) =>
    h(
      "figure",
      { class: "testimonial" },
      t.avatar ? h("img", { class: "avatar", src: t.avatar, alt: "" }) : h("span", { class: "avatar", dataset: { tone: toneFor(t.name) } }, initials(t.name)),
      h(
        "div",
        {},
        h("figcaption", { class: "t-name" }, t.name, t.verified ? h("span", { class: "verified", title: "Verified buyer", "aria-label": "Verified buyer" }, icon("verified", 15)) : null),
        t.rating ? ratingStars(t.rating, null, 13) : null,
        h("blockquote", { class: "t-text" }, `“${t.text}”`),
      ),
    ),
  );

  return h("section", { class: "card-section panel" }, sectionHead(content.testimonialsTitle, summary, "heart"), carousel(cards, { label: "testimonials", className: "t-track" }));
}

/* ---------- newsletter ---------- */

export function newsletter(onSubmit) {
  const n = content.newsletter;
  if (!n.endpoint) return null;
  const input = h("input", { type: "email", name: "email", required: true, placeholder: "Enter your email address", autocomplete: "email", "aria-label": "Email address" });
  const button = h("button", { type: "submit", class: "btn btn-light" }, "Subscribe");
  const form = h("form", { class: "nl-form" }, input, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit(input, button);
  });
  return h(
    "section",
    { class: "newsletter" },
    h("span", { class: "nl-icon" }, icon("mail", 34)),
    h("div", { class: "nl-copy" }, h("h2", {}, n.title), h("p", {}, n.text)),
    h("div", { class: "nl-side" }, form, n.note ? h("p", { class: "nl-note" }, icon("shield", 14), n.note) : null),
  );
}

/* ---------- features strip ---------- */

export function featuresStrip() {
  if (!content.features.length) return null;
  return h(
    "section",
    { class: "features panel", "aria-label": "Why shop with us" },
    ...content.features.map((f) => h("div", { class: "feature" }, icon(f.icon, 26), h("div", {}, h("strong", {}, f.title), h("span", {}, f.text)))),
  );
}

