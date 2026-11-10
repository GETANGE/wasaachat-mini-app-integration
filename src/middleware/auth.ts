import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.ts";
import { readCookie } from "../utils/cookies.ts";
import { verifyToken } from "../utils/token.ts";

// Web sign-in (Sign in with WasaaChat) keeps the session in this HttpOnly cookie;
// inside the WasaaChat app the page sends it as a Bearer token instead.
const SESSION_COOKIE = "viva_session";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : readCookie(req, SESSION_COOKIE);

    if (!token) {
      throw new UnauthorizedError("Missing bearer token");
    }

    const payload = verifyToken(token);
    req.user = { id: payload.uid, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    next(new ForbiddenError("Admin access required"));
    return;
  }
  next();
}
