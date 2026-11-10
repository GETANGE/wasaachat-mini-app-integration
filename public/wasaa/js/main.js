// Entry point: wires up every feature, then signs the shopper in through
// WasaaChat and opens the storefront.
import { api, setSession } from "./core/api.js";
import { callBridge, canPay, closeApp, inWasaaChat, launchCode, useMockBridge } from "./core/bridge.js";
import { errorMessage } from "./core/errors.js";
import { on } from "./core/events.js";
import { beginWebSignIn, takeSignInResult } from "./core/web-auth.js";
import { initSignOut, showSignedOut } from "./features/account/sign-out.js";
import { isSignedOut } from "./core/storage.js";
import { initCart, loadCart } from "./features/cart/cart.js";
import { initCheckout } from "./features/checkout/checkout.js";
import { initHome } from "./features/home/home.js";
import { initOrders } from "./features/orders/orders.js";
import { initProductPage } from "./features/product/product-page.js";
import { initCatalog, loadCategories } from "./features/shop/catalog.js";
import { initWishlist } from "./features/wishlist/wishlist.js";
import { initWishlistStore } from "./features/wishlist/wishlist-store.js";
import { initFooter } from "./layout/footer.js";
import { brandMark, initHeader, setAccountName } from "./layout/header.js";
import { state } from "./state.js";
import { initBootScreen, showApp, showBoot } from "./ui/boot-screen.js";
import { initRouter, navigate } from "./ui/router.js";
import { closeSheet, initSheet } from "./ui/sheet.js";
import { $ } from "./utils/dom.js";

const retry = { label: "Try again", run: () => start() };
const closeShop = { label: "Close shop", run: () => closeApp() };

// code2Session (https://wasaachat.com/developers/launch-codes): the page sends
// wasaa.launchCode to our backend, which exchanges it with the app secret.
// Permissions were already granted by the user when they installed the app.
async function signInInApp() {
  const session = await api.session(launchCode());
  setSession(session);
  return session.user;
}

// Web: is there a Sign in with WasaaChat session cookie already?
async function existingWebSession() {
  try {
    const { user } = await api.me();
    setSession({ web: true });
    return user;
  } catch {
    return null;
  }
}

function showWebSignIn(message) {
  showBoot({
    title: "Sign in to VIVA",
    detail: message ?? "Use your WasaaChat account to shop, save your wishlist and track your orders. You’ll approve this on WasaaChat.",
    action: { label: "Sign in with WasaaChat", run: () => beginWebSignIn() },
  });
}

function showPaymentsNotice() {
  if (canPay()) return;
  const notice = $("notice");
  notice.textContent =
    state.mode === "web"
      ? "You’re shopping on the web. To pay, open VIVA in the WasaaChat app — it’s the same account, cart and orders."
      : "Payments aren’t enabled for this app. You can browse and fill your cart; allow payments in this app’s permissions in WasaaChat to check out.";
  notice.hidden = false;
}

async function enterShop(user, mode) {
  state.user = user;
  state.mode = mode;
  setAccountName(user?.name);
  showApp();
  navigate("home", {}, { replace: true });
  showPaymentsNotice();
  await Promise.all([loadCategories(), loadCart()]);
}

async function start() {
  showBoot({ title: "Opening the shop…", loading: true });
  const signInMessage = takeSignInResult();

  // Respect an explicit sign-out: no automatic sign-in until the shopper asks.
  if (isSignedOut()) {
    showSignedOut();
    return;
  }

  // 1. Signed in on the web with Sign in with WasaaChat?
  const webUser = await existingWebSession();
  if (webUser) {
    await enterShop(webUser, "web");
    return;
  }

  // 2. Not inside WasaaChat: offer Sign in with WasaaChat.
  if (!inWasaaChat()) {
    showWebSignIn(signInMessage);
    return;
  }

  // 3. Inside WasaaChat: launch-code sign-in.
  try {
    await callBridge("ready");
  } catch {
    showWebSignIn();
    return;
  }

  showBoot({ title: "Signing you in…", loading: true });

  let user;
  try {
    user = await signInInApp();
  } catch (error) {
    // A launch code is single-use and lasts 5 minutes; a new one comes with reopening.
    const expired = error?.status === 401;
    showBoot(
      expired
        ? { title: "Please reopen the shop", detail: "Your sign-in link from WasaaChat has expired.", action: closeShop }
        : { title: "Couldn’t sign you in", detail: errorMessage(error), action: retry },
    );
    return;
  }

  await enterShop(user, "app");
}

function onSessionEnded() {
  closeSheet();
  if (state.mode === "web") {
    showWebSignIn("Your session has ended. Sign in again to keep going — your cart is saved.");
    return;
  }
  showBoot({
    title: "Your session has ended",
    detail: "For your security, WasaaChat sessions last an hour. Close and reopen the shop to keep going — your cart is saved.",
    action: closeShop,
  });
}

// Local preview: http://localhost:3000/wasaa/?mock (also ?mock=decline, ?mock=nopay).
async function maybeInstallMock() {
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!isLocal || !new URLSearchParams(location.search).has("mock")) return;
  const { installMock } = await import("./dev/mock.js");
  useMockBridge(installMock());
}

async function main() {
  await maybeInstallMock();

  $("boot-brand").replaceChildren(brandMark(44));
  initRouter();
  initSheet();
  initHeader();
  initFooter();
  initWishlistStore();
  initHome();
  initCatalog();
  initProductPage();
  initWishlist();
  initCart();
  initCheckout();
  initOrders();
  initSignOut(() => (inWasaaChat() ? start() : beginWebSignIn()));
  initBootScreen();
  on("session:ended", onSessionEnded);

  start();
}

main();
