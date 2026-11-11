// Sign in with WasaaChat on the web (outside the WasaaChat app). The backend
// handles the OAuth redirect; see src/routes/oauth.routes.ts.

export function beginWebSignIn(returnTo = "/wasaa/") {
  location.assign(`/auth/wasaachat?returnTo=${encodeURIComponent(returnTo)}`);
}

const RESULT_MESSAGES = {
  declined: "You didn’t allow VIVA on the WasaaChat screen, so you’re not signed in.",
  failed: "WasaaChat sign-in didn’t complete. Please try again.",
  expired: "That sign-in took too long or started in another browser. Please try again.",
  unavailable: "Sign in with WasaaChat isn’t set up on this server yet.",
};

// Reads ?signin=… left by the callback, then removes it from the address bar.
export function takeSignInResult() {
  const url = new URL(location.href);
  const result = url.searchParams.get("signin");
  if (!result) return null;
  // why= is a short code from the server saying which step failed, e.g.
  // token_invalid_client. Shown small so it can be read back to support.
  const why = (url.searchParams.get("why") ?? "").replace(/[^a-z0-9_]/gi, "").slice(0, 40);
  url.searchParams.delete("signin");
  url.searchParams.delete("why");
  history.replaceState(history.state, "", url.pathname + (url.search || "") + url.hash);
  const message = RESULT_MESSAGES[result] ?? null;
  if (why) console.warn(`[signin] ${result}: ${why}`);
  return message && why ? `${message} (${why})` : message;
}
