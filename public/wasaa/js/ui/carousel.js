import { h } from "../utils/dom.js";
import { icon } from "./icons.js";

// Horizontal scroll-snap row with previous/next buttons. Swipe works natively
// on touch; the buttons scroll by one viewport width and hide at either end.
export function carousel(items, { label, className = "" } = {}) {
  const track = h("div", { class: `carousel-track ${className}`, role: "list", "aria-label": label }, ...items.map((item) => h("div", { class: "carousel-item", role: "listitem" }, item)));
  const prev = h("button", { type: "button", class: "carousel-btn prev", "aria-label": `Previous ${label}` }, icon("chevronLeft", 18));
  const next = h("button", { type: "button", class: "carousel-btn next", "aria-label": `Next ${label}` }, icon("chevronRight", 18));

  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 2;
    prev.hidden = track.scrollLeft <= 2;
    next.hidden = track.scrollLeft >= max;
  };
  const scroll = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: "smooth" });

  prev.addEventListener("click", () => scroll(-1));
  next.addEventListener("click", () => scroll(1));
  track.addEventListener("scroll", update, { passive: true });
  new ResizeObserver(update).observe(track);
  requestAnimationFrame(update);

  return h("div", { class: "carousel" }, prev, track, next);
}
