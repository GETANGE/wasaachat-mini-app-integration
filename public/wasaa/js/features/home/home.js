// Home page: hero, categories, top picks, promos, testimonials, newsletter, features.
import { HOME_PICKS_LIMIT } from "../../config.js";
import { content } from "../../content.js";
import { api } from "../../core/api.js";
import { on } from "../../core/events.js";
import { state } from "../../state.js";
import { busy } from "../../ui/components.js";
import { onEnter } from "../../ui/router.js";
import { toast } from "../../ui/toast.js";
import { $ } from "../../utils/dom.js";
import { categoryRow, featuresStrip, hero, newsletter, promos, testimonials, topPicks } from "./sections.js";

async function subscribe(input, button) {
  const email = input.value.trim();
  if (!input.checkValidity() || !email) {
    toast("Enter a valid email address.", true);
    input.focus();
    return;
  }
  const restore = busy(button, "");
  try {
    const response = await fetch(content.newsletter.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error();
    input.value = "";
    toast("You’re subscribed. Watch your inbox!");
  } catch {
    toast("Couldn’t subscribe right now. Try again later.", true);
  } finally {
    restore();
  }
}

function renderHome() {
  $("view-home").replaceChildren(
    ...[hero(), categoryRow(), topPicks(), promos(), testimonials(), newsletter(subscribe), featuresStrip()].filter(Boolean),
  );
}

async function loadPicks() {
  try {
    const { items } = await api.products({ page: 1, limit: HOME_PICKS_LIMIT });
    state.picks = items;
  } catch {
    state.picks = [];
  }
  if (state.view === "home") renderHome();
}

export function initHome() {
  onEnter("home", () => {
    renderHome();
    if (state.picks === null) loadPicks();
  });
  on("categories:loaded", () => state.view === "home" && renderHome());
  on("stock:changed", () => {
    state.picks = null;
    if (state.view === "home") loadPicks();
  });
}
