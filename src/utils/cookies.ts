import type { Request, Response } from "express";

export function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

type CookieOptions = {
  maxAgeSeconds: number;
  path?: string;
  sameSite?: "Lax" | "Strict" | "None";
  // CHIPS: a cookie set inside another site's frame, kept separately for that
  // site. Lets the in-app session cookie work in WasaaChat's frame.
  partitioned?: boolean;
};

// HttpOnly always; Secure in production, over HTTPS, and whenever
// SameSite=None (browsers drop SameSite=None cookies that aren't Secure;
// http://localhost counts as secure).
export function setCookie(req: Request, res: Response, name: string, value: string, options: CookieOptions) {
  const secure =
    options.sameSite === "None" || process.env.NODE_ENV === "production" || req.secure || req.get("x-forwarded-proto") === "https";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
    "HttpOnly",
    `SameSite=${options.sameSite ?? "Lax"}`,
  ];
  if (secure) parts.push("Secure");
  if (options.partitioned) parts.push("Partitioned");
  res.append("Set-Cookie", parts.join("; "));
}

// Clearing must repeat the attributes the cookie was set with (path,
// SameSite, Partitioned), or the browser treats it as a different cookie.
export function clearCookie(
  req: Request,
  res: Response,
  name: string,
  path = "/",
  options: Omit<CookieOptions, "maxAgeSeconds" | "path"> = {},
) {
  setCookie(req, res, name, "", { ...options, maxAgeSeconds: 0, path });
}
