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

type CookieOptions = { maxAgeSeconds: number; path?: string; sameSite?: "Lax" | "Strict" | "None" };

// HttpOnly always; Secure in production (or when the request came over HTTPS).
export function setCookie(req: Request, res: Response, name: string, value: string, options: CookieOptions) {
  const secure = process.env.NODE_ENV === "production" || req.secure || req.get("x-forwarded-proto") === "https";
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path ?? "/"}`,
    `Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`,
    "HttpOnly",
    `SameSite=${options.sameSite ?? "Lax"}`,
  ];
  if (secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}

export function clearCookie(req: Request, res: Response, name: string, path = "/") {
  setCookie(req, res, name, "", { maxAgeSeconds: 0, path });
}
