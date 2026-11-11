import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.ts";
import * as userRepository from "../repositories/user.repository.ts";
import {
  finishSignIn,
  SESSION_COOKIE,
  SignInDeclined,
  SignInFailed,
  startSignIn,
  STATE_COOKIE,
  STATE_TTL_SECONDS,
  WEB_SESSION_SECONDS,
} from "../services/wasaachat-oauth.service.ts";
import { APP_SESSION_COOKIE, APP_SESSION_COOKIE_OPTIONS } from "../services/session.service.ts";
import { clearCookie, readCookie, setCookie } from "../utils/cookies.ts";

// GET /auth/wasaachat?returnTo=/wasaa/
export function start(req: Request, res: Response) {
  let started: ReturnType<typeof startSignIn>;
  try {
    started = startSignIn(req.query.returnTo);
  } catch (err) {
    // Missing WASAACHAT_CLIENT_ID / WASAACHAT_CODE_2_SESSION / WASAA_OAUTH_REDIRECT_URI.
    logger.error("Sign in with WasaaChat is not configured", { error: err instanceof Error ? err.message : String(err) });
    res.redirect(302, "/wasaa/?signin=unavailable");
    return;
  }
  setCookie(req, res, STATE_COOKIE, started.cookie, { maxAgeSeconds: STATE_TTL_SECONDS, path: "/auth/wasaachat" });
  res.redirect(302, started.url);
}

// GET /auth/wasaachat/callback?code=…&state=…  (or ?error=access_denied&state=…)
export async function callback(req: Request, res: Response, _next: NextFunction) {
  const stateCookie = readCookie(req, STATE_COOKIE);
  clearCookie(req, res, STATE_COOKIE, "/auth/wasaachat"); // one use only

  try {
    const { returnTo, sessionToken } = await finishSignIn(req.query as Record<string, unknown>, stateCookie);
    setCookie(req, res, SESSION_COOKIE, sessionToken, { maxAgeSeconds: WEB_SESSION_SECONDS });
    res.redirect(302, returnTo);
  } catch (err) {
    if (err instanceof SignInDeclined) {
      const declined = err.reason === "access_denied";
      res.redirect(302, `/wasaa/?signin=${declined ? "declined" : `failed&why=${encodeURIComponent(err.reason)}`}`);
      return;
    }
    if (!stateCookie) {
      res.redirect(302, "/wasaa/?signin=expired");
      return;
    }
    const why = err instanceof SignInFailed ? err.reason : err instanceof Error && err.name === "TimeoutError" ? "timeout" : "server";
    logger.warn("Sign in with WasaaChat failed", { why, error: err instanceof Error ? err.message : String(err) });
    res.redirect(302, `/wasaa/?signin=failed&why=${encodeURIComponent(why)}`);
  }
}

// GET /api/wasaa/me — who is signed in, and how: session "app" (launch code)
// or "web" (Sign in with WasaaChat). { user: null } when nobody is; not an error.
export async function me(req: Request, res: Response) {
  const user = req.user ? await userRepository.findPublicById(req.user.id) : null;
  res.json({ user: user ?? null, session: user ? (req.user?.kind ?? null) : null });
}

// POST /api/wasaa/logout — ends this browser's session (in-app and web).
export function logout(req: Request, res: Response) {
  clearCookie(req, res, SESSION_COOKIE);
  clearCookie(req, res, APP_SESSION_COOKIE, "/", APP_SESSION_COOKIE_OPTIONS);
  res.status(204).end();
}
