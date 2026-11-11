import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.ts";
import * as userRepository from "../repositories/user.repository.ts";
import {
  finishSignIn,
  SESSION_COOKIE,
  SignInDeclined,
  startSignIn,
  STATE_COOKIE,
  STATE_TTL_SECONDS,
  WEB_SESSION_SECONDS,
} from "../services/wasaachat-oauth.service.ts";
import { clearCookie, readCookie, setCookie } from "../utils/cookies.ts";
import { NotFoundError } from "../utils/errors.ts";

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
      res.redirect(302, `/wasaa/?signin=${err.reason === "access_denied" ? "declined" : "failed"}`);
      return;
    }
    logger.warn("Sign in with WasaaChat failed", { error: err instanceof Error ? err.message : String(err) });
    res.redirect(302, `/wasaa/?signin=${stateCookie ? "failed" : "expired"}`);
  }
}

// GET /api/wasaa/me — who is signed in (works with the web cookie or an in-app session).
export async function me(req: Request, res: Response) {
  const user = await userRepository.findPublicById(req.user!.id);
  if (!user) throw new NotFoundError("User not found");
  res.json({ user });
}

// POST /api/wasaa/logout — ends the web session on this browser.
export function logout(req: Request, res: Response) {
  clearCookie(req, res, SESSION_COOKIE);
  res.status(204).end();
}
