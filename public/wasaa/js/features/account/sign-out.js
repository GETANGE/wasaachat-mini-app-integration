// Sign out: ends the shop session on this device and closes the mini-app.
// Identity comes from WasaaChat, so reopening the shop from WasaaChat signs the
// user back in; signing out of WasaaChat itself happens in WasaaChat.
import { api, setSession } from "../../core/api.js";
import { closeApp } from "../../core/bridge.js";
import { clearDeviceData, setSignedOut } from "../../core/storage.js";
import { state } from "../../state.js";
import { showBoot } from "../../ui/boot-screen.js";
import { closeSheet, openSheet } from "../../ui/sheet.js";
import { $, h } from "../../utils/dom.js";
import { replaceWishlist } from "../wishlist/wishlist-store.js";

async function signOut() {
  closeSheet();
  const wasWeb = state.mode === "web";
  await api.logout(); // clears the HttpOnly session cookies
  setSession(null);
  state.mode = null;
  state.user = null;
  state.cart = null;
  state.orders = null;
  replaceWishlist([]);
  clearDeviceData();
  setSignedOut(true); // stay signed out after a reload until the shopper signs in again
  showSignedOut();
  if (!wasWeb) closeApp();
}

let signInHandler = null;

// Signed-out screen, shown after signing out and on every load until the
// shopper chooses to sign in again.
export function showSignedOut() {
  showBoot({
    title: "You’re signed out",
    detail: "Sign in with your WasaaChat account to shop, see your orders and check out.",
    action: { label: "Sign in with WasaaChat", run: () => signInHandler?.() },
  });
}

export function initSignOut(onSignIn) {
  signInHandler = () => {
    setSignedOut(false);
    onSignIn();
  };
  $("sign-out").addEventListener("click", confirmSignOut);
}

function confirmSignOut() {
  openSheet({
    title: "Sign out of VIVA?",
    body: [
      h(
        "p",
        { class: "detail-desc" },
        "This closes the shop and removes your wishlist and saved delivery address from this device. Your cart and orders stay in your account for next time.",
      ),
    ],
    foot: [
      h(
        "div",
        { class: "btn-row" },
        h("button", { type: "button", class: "btn btn-ghost", onClick: closeSheet }, "Cancel"),
        h("button", { type: "button", class: "btn btn-primary", onClick: signOut }, "Sign out"),
      ),
    ],
  });
}

