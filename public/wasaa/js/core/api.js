import { API_BASE } from "../config.js";
import { emit } from "./events.js";
import { logResponse } from "./logger.js";

let accessToken = null;
let signedIn = false;

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// In-app sessions carry a Bearer token; web sessions use an HttpOnly cookie
// the page never sees ({ web: true }).
export function setSession(session) {
  accessToken = session?.accessToken ?? null;
  signedIn = Boolean(session);
}

async function sendRequest(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => null);
  return { response, body };
}

async function rawFetch(path, options = {}) {
  const started = performance.now();
  const method = options.method ?? "GET";
  const { response, body } = await sendRequest(path, options);
  logResponse(`[api] ${method} ${API_BASE}${path}`, {
    status: response.status,
    ok: response.ok,
    ms: Math.round(performance.now() - started),
    request: options.body ? JSON.parse(options.body) : undefined,
    response: body,
  });
  return { response, body };
}

export async function apiFetch(path, options = {}) {
  const { response, body } = await rawFetch(path, options);

  // Shop sessions end with the WasaaChat session (one hour) and can't be
  // refreshed; the user reopens the app to get a new launch code.
  if (response.status === 401 && signedIn && !path.startsWith("/wasaa/")) {
    accessToken = null;
    signedIn = false;
    emit("session:ended");
    throw new ApiError("Your session ended. Close and reopen the app.", 401, body);
  }

  if (!response.ok) {
    const issue = body?.issues?.[0];
    const message = issue ? `${issue.path}: ${issue.message}` : body?.error ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status, body);
  }

  return body;
}

const json = (method, body) => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  // code2Session: exchange wasaa.launchCode for a shop session.
  session: (code) => apiFetch("/wasaa/session", json("POST", { code })),
  // Web: who is signed in via the Sign in with WasaaChat cookie, and sign out.
  me: () => apiFetch("/wasaa/me"),
  logout: () => apiFetch("/wasaa/logout", json("POST")).catch(() => null),

  categories: () => apiFetch("/categories"),
  products: ({ page = 1, limit = 20, category, search } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    return apiFetch(`/products?${params}`);
  },
  product: (slug) => apiFetch(`/products/${encodeURIComponent(slug)}`),

  cart: () => apiFetch("/cart"),
  addToCart: (productId, quantity = 1) => apiFetch("/cart/items", json("POST", { productId, quantity })),
  setCartQuantity: (productId, quantity) => apiFetch(`/cart/items/${productId}`, json("PATCH", { quantity })),
  removeFromCart: (productId) => apiFetch(`/cart/items/${productId}`, json("DELETE")),

  orders: () => apiFetch("/orders"),
  order: (id) => apiFetch(`/orders/${id}`),
  checkout: (shippingAddress) => apiFetch("/orders/checkout", json("POST", { shippingAddress })),
  preparePayment: (orderId) => apiFetch(`/orders/${orderId}/payment`, json("POST")),
  cancelOrder: (orderId) => apiFetch(`/orders/${orderId}/cancel`, json("POST")),
};
