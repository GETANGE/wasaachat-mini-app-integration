import { $ } from "../utils/dom.js";
import { hideToast } from "./toast.js";

// One bottom sheet is reused for every overlay. Each open() returns a token so
// long-running flows (payment polling) can tell whether their sheet is still
// the one on screen before updating it.
let onCloseCallback = null;
let currentToken = 0;

export function openSheet({ title, body = [], foot = [], onClose = null }) {
  currentToken += 1;
  onCloseCallback = onClose;
  hideToast();
  $("sheet-title").textContent = title;
  $("sheet-body").replaceChildren(...body);
  $("sheet-foot").replaceChildren(...foot);
  $("sheet").hidden = false;
  $("sheet-backdrop").hidden = false;
  document.body.classList.add("sheet-open");
  $("sheet-body").scrollTop = 0;
  return currentToken;
}

export const isSheetOpen = (token) => token === currentToken && !$("sheet").hidden;

export function updateSheet(token, { title, body, foot }) {
  if (!isSheetOpen(token)) return false;
  if (title !== undefined) $("sheet-title").textContent = title;
  if (body) $("sheet-body").replaceChildren(...body);
  if (foot) $("sheet-foot").replaceChildren(...foot);
  return true;
}

export function closeSheet() {
  if ($("sheet").hidden) return;
  $("sheet").hidden = true;
  $("sheet-backdrop").hidden = true;
  document.body.classList.remove("sheet-open");
  const callback = onCloseCallback;
  onCloseCallback = null;
  callback?.();
}

export function initSheet() {
  $("sheet-close").addEventListener("click", closeSheet);
  $("sheet-backdrop").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheet();
  });
}
