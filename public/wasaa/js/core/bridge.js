import { logResponse } from "./logger.js";

// The real WasaaChat SDK defines window.wasaa as read-only, so local mock mode
// registers its own object here instead of overwriting the global.
let mockBridge = null;

export function useMockBridge(bridge) {
  mockBridge = bridge;
}

const getBridge = () => mockBridge ?? window.wasaa;

export const hasBridge = () => Boolean(getBridge());

// True inside the WasaaChat app (native host) or WasaaChat Web (in a frame).
// In a normal browser tab the adapter script still defines window.wasaa, but
// no host will ever answer it.
export function inWasaaChat() {
  const bridge = getBridge();
  if (!bridge) return false;
  if (bridge === mockBridge) return true;
  return bridge.platform !== "web" || window.parent !== window;
}

export const launchCode = () => getBridge()?.launchCode ?? "";

export const canPay = () => Boolean(getBridge()?.can?.("wallet.pay"));

export function closeApp() {
  return getBridge()?.close?.();
}

// Calls a bridge method and logs what it returned (or threw).
export async function callBridge(method, ...args) {
  const started = performance.now();
  const label = `[wasaa] ${method}`;
  const ms = () => Math.round(performance.now() - started);
  try {
    const result = await getBridge()[method](...args);
    logResponse(label, { status: "ok", ms: ms(), request: args[0], response: result });
    return result;
  } catch (error) {
    logResponse(label, { status: "error", ok: false, ms: ms(), request: args[0], response: error });
    throw error;
  }
}
