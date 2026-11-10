import { $ } from "../utils/dom.js";

let timer;

export function toast(message, isError = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", isError);
  el.hidden = false;
  clearTimeout(timer);
  timer = setTimeout(hideToast, isError ? 4500 : 2600);
}

export function hideToast() {
  $("toast").hidden = true;
}
