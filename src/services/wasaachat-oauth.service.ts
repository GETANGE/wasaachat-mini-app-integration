import { createHash, randomBytes } from "node:crypto";
import { logger } from "../config/logger.ts";
import { AppError, BadRequestError, UnauthorizedError } from "../utils/errors.ts";
import { seal, unseal } from "../utils/sealed.ts";
import { upsertWasaaUser } from "./wasaachat.service.ts";
import { signToken } from "../utils/token.ts";

// Sign in with WasaaChat on the web — "Flow A" (authorization code + PKCE)
// from https://wasaachat.com/developers/sign-in-with-wasaachat
//
//   GET /auth/wasaachat           → redirect to WasaaChat's consent page
//   GET /auth/wasaachat/callback  → check state, redeem the code, sign in
//
// Inside the WasaaChat app the shop signs in with launch codes instead.

export const OAUTH_SCOPES = "openid profile";
export const STATE_COOKIE = "wc_oauth";
export const STATE_TTL_SECONDS = 10 * 60; // codes must be redeemed within 10 minutes
export const SESSION_COOKIE = "viva_session";
export const WEB_SESSION_SECONDS = Number(process.env.WEB_SESSION_HOURS ?? 168) * 60 * 60;

const DEFAULT_AUTHORIZE_URL = "https://wasaachat.com/oauth/consent";
const DEFAULT_BASE = "https://api.wasaachat.com/api/v1/core";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new AppError(500, `Sign in with WasaaChat is not configured: ${name} is missing`);
  return value;
}

const apiBase = () => process.env.WASAA_BASE ?? DEFAULT_BASE;
const issuer = () => `${apiBase()}/identity/oauth`;

function oauthConfig() {
  return {
    clientId: env("WASAA_APP_ID"),
    clientSecret: env("WASAA_APP_SECRET"),
    redirectUri: env("WASAA_OAUTH_REDIRECT_URI"),
    authorizeUrl: process.env.WASAA_OAUTH_AUTHORIZE_URL ?? DEFAULT_AUTHORIZE_URL,
  };
}

const b64url = (buf: Buffer) => buf.toString("base64url");

// Only send people back into the shop, never to another site.
export function safeReturnTo(value: unknown): string {
  const path = typeof value === "string" ? value : "";
  return /^\/wasaa\/[A-Za-z0-9/_\-?=&.%#]*$/.test(path) && !path.startsWith("//") ? path : "/wasaa/";
}

type PendingSignIn = { state: string; verifier: string; nonce: string; returnTo: string };

/* ---------- step 1: send the user to the consent page ---------- */

export function startSignIn(returnTo: unknown) {
  const { clientId, redirectUri, authorizeUrl } = oauthConfig();
  const pending: PendingSignIn = {
    state: b64url(randomBytes(32)),
    verifier: b64url(randomBytes(48)), // 64 chars, within PKCE's 43–128
    nonce: b64url(randomBytes(16)),
    returnTo: safeReturnTo(returnTo),
  };

  const url = new URL(authorizeUrl);
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPES,
    state: pending.state,
    nonce: pending.nonce,
    code_challenge: b64url(createHash("sha256").update(pending.verifier).digest()),
    code_challenge_method: "S256",
  }).toString();

  return { url: url.toString(), cookie: seal(pending, STATE_TTL_SECONDS) };
}

/* ---------- step 2: redeem the code ---------- */

type TokenResponse = { access_token: string; token_type: string; expires_in: number; scope: string; id_token?: string };

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function redeemCode(code: string, verifier: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  const response = await fetch(`${apiBase()}/identity/oauth/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirectUri }),
    signal: AbortSignal.timeout(10_000),
  });
  const json = await readJson(response);

  if (!response.ok || typeof json?.access_token !== "string") {
    logger.warn("WasaaChat token exchange failed", { status: response.status, error: json?.error });
    throw new UnauthorizedError("WasaaChat sign-in failed");
  }
  if (!String(json.scope ?? "").split(" ").includes("openid")) {
    throw new UnauthorizedError("WasaaChat sign-in did not include your identity");
  }
  return json as unknown as TokenResponse;
}

// The ID token came straight from the token endpoint over TLS, authenticated
// with our client secret, so (per OpenID Connect Core §3.1.3.7) we check its
// claims — issuer, audience, expiry and our nonce — without fetching the JWKS.
export function checkIdToken(idToken: string | undefined, nonce: string): string {
  if (!idToken) throw new UnauthorizedError("WasaaChat did not return an ID token");
  let claims: Record<string, unknown>;
  try {
    claims = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString("utf8"));
  } catch {
    throw new UnauthorizedError("WasaaChat returned an unreadable ID token");
  }
  const { clientId } = oauthConfig();
  const audienceOk = Array.isArray(claims.aud) ? claims.aud.includes(clientId) : claims.aud === clientId;
  const now = Math.floor(Date.now() / 1000);

  if (claims.iss !== issuer() || !audienceOk || typeof claims.exp !== "number" || claims.exp < now || claims.nonce !== nonce || typeof claims.sub !== "string") {
    logger.warn("WasaaChat ID token rejected", { iss: claims.iss, aud: claims.aud, expired: Number(claims.exp) < now, nonceMatches: claims.nonce === nonce });
    throw new UnauthorizedError("WasaaChat sign-in could not be verified");
  }
  return claims.sub;
}

type UserInfo = { sub: string; display_name?: string; name?: string; avatar_url?: string; picture?: string };

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch(`${apiBase()}/identity/oauth/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  const json = await readJson(response);
  if (!response.ok || typeof json?.sub !== "string") {
    logger.warn("WasaaChat userinfo failed", { status: response.status });
    throw new AppError(502, "Could not read your WasaaChat profile");
  }
  return json as unknown as UserInfo;
}

/* ---------- callback ---------- */

export class SignInDeclined extends Error {
  constructor(
    public readonly reason: string,
    public readonly returnTo: string,
  ) {
    super(reason);
  }
}

export async function finishSignIn(query: Record<string, unknown>, stateCookie: string | undefined) {
  const pending = unseal<PendingSignIn>(stateCookie);
  if (!pending) throw new BadRequestError("Your sign-in took too long or was started in another browser. Please try again.");
  if (query.state !== pending.state) throw new BadRequestError("Sign-in response did not match this browser. Please try again.");

  if (typeof query.error === "string") {
    // access_denied: the user declined on the consent screen.
    throw new SignInDeclined(query.error, pending.returnTo);
  }
  if (typeof query.code !== "string" || !query.code) throw new BadRequestError("WasaaChat did not return a sign-in code");

  const tokens = await redeemCode(query.code, pending.verifier);
  const sub = checkIdToken(tokens.id_token, pending.nonce);
  const profile = await fetchUserInfo(tokens.access_token);
  if (profile.sub !== sub) throw new UnauthorizedError("WasaaChat sign-in could not be verified");

  // sub is the same id as the mini-app's open_user_id, so web and in-app
  // purchases land on one account.
  const user = await upsertWasaaUser(sub, (profile.display_name ?? profile.name ?? "").trim() || null);
  return {
    user,
    returnTo: pending.returnTo,
    sessionToken: signToken({ uid: user.id, role: user.role }, WEB_SESSION_SECONDS),
  };
}
