// Tiny pub/sub so features can react to each other without importing each
// other (which would create circular dependencies).
//
// Events used:
//   "stock:changed"  — product stock may differ (checkout, cancel); shop reloads
//   "orders:changed" — the order list is stale; orders reloads when visible
//   "wishlist:changed" — hearts and the wishlist badge need refreshing
//   "categories:loaded" — category list arrived (menus, home row)
//   "route:changed"  — { route, view } after every navigation
//   "session:ended"  — the WasaaChat session expired; the user must reopen the app
const listeners = new Map();

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function emit(event, payload) {
  for (const handler of listeners.get(event) ?? []) handler(payload);
}
