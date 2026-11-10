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
  url.searchParams.delete("signin");
  history.replaceState(history.state, "", url.pathname + (url.search || "") + url.hash);
  return RESULT_MESSAGES[result] ?? null;
}
