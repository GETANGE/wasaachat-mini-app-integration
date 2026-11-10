import { content } from "../content.js";
import { icon } from "../ui/icons.js";
import { $, h } from "../utils/dom.js";
import { brandMark } from "./header.js";

const internalLink = (link) => h("a", { href: "#", class: "footer-link", dataset: { goto: link.goto } }, link.label);
const externalLink = (link) => h("a", { href: link.href, class: "footer-link", target: "_blank", rel: "noopener" }, link.label);

function column(title, links) {
  if (!links.length) return null;
  return h("div", { class: "footer-col" }, h("h3", { class: "footer-title" }, title), h("ul", {}, ...links.map((link) => h("li", {}, link.href ? externalLink(link) : internalLink(link)))));
}

export function initFooter() {
  const { brand, footer } = content;
  const year = new Date().getFullYear();

  const social = footer.social.length
    ? h(
        "div",
        { class: "social" },
        ...footer.social.map((item) => h("a", { href: item.href, class: "social-link", target: "_blank", rel: "noopener", "aria-label": item.network }, icon(item.network, 16))),
      )
    : null;

  $("site-footer").replaceChildren(
    h(
      "div",
      { class: "container footer-grid" },
      h("div", { class: "footer-about" }, brandMark(34), h("p", {}, brand.blurb), social),
      ...footer.columns.map((col) => column(col.title, col.links)),
      column("Company", footer.company),
    ),
    h(
      "div",
      { class: "container footer-bottom" },
      h("span", {}, `© ${year} ${brand.name}. All rights reserved.`),
      footer.legal.length ? h("nav", { class: "footer-legal", "aria-label": "Legal" }, ...footer.legal.map(externalLink)) : null,
    ),
  );
}
