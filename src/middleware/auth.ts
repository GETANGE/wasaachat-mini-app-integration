import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.ts";
import * as userRepository from "../repositories/user.repository.ts";
import { APP_SESSION_COOKIE } from "../services/session.service.ts";
import { readCookie } from "../utils/cookies.ts";
import { verifyToken } from "../utils/token.ts";

// Web sign-in (Sign in with WasaaChat) keeps the session in this HttpOnly cookie.
const SESSION_COOKIE = "viva_session";

// Reads the session from, in order: a Bearer header (in-app fallback when the
// browser blocks the frame's cookie), the in-app cookie, the web cookie.
// Throws UnauthorizedError when there is none or it is no longer valid.
async function resolveSessionUser(req: Request) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ")
    ? header.slice(7)
    : (readCookie(req, APP_SESSION_COOKIE) ?? readCookie(req, SESSION_COOKIE));

  if (!token) {
    throw new UnauthorizedError("Missing bearer token");
  }

  const payload = verifyToken(token);

  // A web session dies when the user disconnects the app in WasaaChat
  // (deauthorize webhook). In-app sessions end with the WasaaChat session.
  if (payload.kind === "web") {
    const revokedAt = await userRepository.findWebSessionsRevokedAt(payload.uid);
    if (revokedAt && payload.issuedAt * 1000 <= revokedAt.getTime()) {
      throw new UnauthorizedError("Your WasaaChat connection was removed. Please sign in again.");
    }
  }

  return { id: payload.uid, role: payload.role, kind: payload.kind };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await resolveSessionUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

// Like requireAuth, but "not signed in" is a normal answer: req.user stays
// unset instead of a 401. Other errors (e.g. database) still surface.
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await resolveSessionUser(req);
    next();
  } catch (err) {
    next(err instanceof UnauthorizedError ? undefined : err);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    next(new ForbiddenError("Admin access required"));
    return;
  }
  next();
}
