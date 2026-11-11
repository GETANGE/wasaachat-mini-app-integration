// Turns API and bridge errors into a sentence the shopper can act on.
export function errorMessage(error) {
  switch (error?.error) {
    case "scope_not_granted":
      return "Allow payments for this app in WasaaChat to buy.";
    case "session_expired":
      return "Your session ended. Close and reopen the app.";
    case "unavailable":
      return "Could not reach WasaaChat. Try again.";
  }
  // Bridge errors carry a readable error_description (e.g. "Mini-app payments
  // are temporarily unavailable. Nothing was charged").
  if (typeof error?.error_description === "string" && error.error_description) return error.error_description;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Try again.";
}

export const stockErrorMessage = (error) =>
  error?.status === 409 ? "Not enough stock for that quantity." : errorMessage(error);
