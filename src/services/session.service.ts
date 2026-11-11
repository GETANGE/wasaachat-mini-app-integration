import { signToken } from "../utils/token.ts";

// Shop sessions start only from a WasaaChat launch-code exchange
// (code2Session, see wasaachat.service.ts) and end when the WasaaChat bridge
// session ends. Per WasaaChat's docs the bridge session cannot be refreshed,
// by design, so an uninstall or revoked permission takes effect; when it ends
// the user reopens the app and gets a new launch code.
// https://wasaachat.com/developers/launch-codes

const MAX_SESSION_SECONDS = 60 * 60; // bridge sessions last one hour

// As in WasaaChat's launch-code examples, the in-app session lives in an
// HttpOnly cookie. The app runs in WasaaChat's frame, so it is SameSite=None,
// Secure and Partitioned. Separate from the web cookie (viva_session).
export const APP_SESSION_COOKIE = "viva_app_session";
export const APP_SESSION_COOKIE_OPTIONS = { sameSite: "None", partitioned: true } as const;

type SessionUser = {
  id: number;
  role: "customer" | "admin";
};

export function issueSession(user: SessionUser, bridgeExpiresIn: number) {
  const expiresIn = Math.max(60, Math.min(Math.floor(bridgeExpiresIn) || MAX_SESSION_SECONDS, MAX_SESSION_SECONDS));
  return {
    accessToken: signToken({ uid: user.id, role: user.role, kind: "app" }, expiresIn),
    expiresIn,
  };
}
