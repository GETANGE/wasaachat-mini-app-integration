import { SECRET_KEYS } from "../config.js";

// Masks tokens so they don't sit in the console where they could be copied.
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        SECRET_KEYS.has(key) && typeof v === "string" ? `${v.slice(0, 6)}…[redacted]` : redact(v),
      ]),
    );
  }
  return value;
}

export function logResponse(label, { status, ok = true, ms, request, response }) {
  const style = ok ? "color:#0f6b4f;font-weight:bold" : "color:#b4372a;font-weight:bold";
  console.groupCollapsed(`%c${label}%c ${status ?? ""}${ms !== undefined ? ` · ${ms}ms` : ""}`, style, "color:inherit");
  if (request !== undefined) console.log("request:", redact(request));
  console.log("response:", redact(response));
  console.groupEnd();
}
