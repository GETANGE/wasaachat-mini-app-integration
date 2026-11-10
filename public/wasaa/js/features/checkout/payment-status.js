import { h } from "../../utils/dom.js";
import { formatMoney } from "../../utils/format.js";

const STEPS = ["Order placed", "Confirm in WasaaChat", "Payment received"];

function stepsList(active) {
  return h(
    "ol",
    { class: "steps" },
    ...STEPS.map((label, index) =>
      h("li", { dataset: { state: index < active ? "done" : index === active ? "active" : "todo" } }, label),
    ),
  );
}

// Body of the payment sheet. With no `tone` it shows a spinner (in progress);
// tone is "ok" | "bad" | "wait" for final states. `step` (0–3) shows progress.
export function payStatus({ tone, icon, amount, title, detail, step }) {
  return h(
    "div",
    { class: "pay-state" },
    tone ? h("div", { class: `pay-icon ${tone}` }, icon) : h("div", { class: "spinner lg" }),
    amount ? h("p", { class: "pay-amount" }, formatMoney(amount)) : null,
    h("p", { class: "pay-title" }, title),
    detail ? h("p", { class: "pay-detail" }, detail) : null,
    step !== undefined ? stepsList(step) : null,
  );
}
