import { $ } from "../utils/dom.js";

// Full-screen state shown before the app is usable (loading, not inside
// WasaaChat, sign-in failed, session ended). `action` adds one button.
let actionHandler = null;

export function showBoot({ title, detail = "", loading = false, action = null }) {
  $("boot").hidden = false;
  $("app").hidden = true;
  $("boot-title").textContent = title;
  $("boot-detail").textContent = detail;
  $("boot-spinner").hidden = !loading;
  $("boot-retry").hidden = !action;
  $("boot-retry").textContent = action?.label ?? "";
  actionHandler = action?.run ?? null;
}

export function showApp() {
  $("boot").hidden = true;
  $("app").hidden = false;
}

export function initBootScreen() {
  $("boot-retry").addEventListener("click", () => actionHandler?.());
}
