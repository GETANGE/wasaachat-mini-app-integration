export const API_BASE = "/api";

export const PAGE_SIZE = 20;

export const LOW_STOCK_THRESHOLD = 5;

export const PAYMENT_POLL_INTERVAL_MS = 2000;
export const PAYMENT_POLL_ATTEMPTS = 90;
export const FINAL_PAYMENT_STATUSES = new Set(["paid", "declined", "expired", "failed", "refunded"]);

export const STORAGE_KEYS = {
  address: "wasaa-shop:address",
  wishlist: "wasaa-shop:wishlist",
};

// Set when the shopper signs out; stops automatic sign-in on the next load.
export const SIGNED_OUT_KEY = "wasaa-shop:signed-out";

export const HOME_PICKS_LIMIT = 12;

export const DEFAULT_ADDRESS = {
  line1: "",
  line2: "",
  city: "Nairobi",
  region: "",
  postalCode: "",
  country: "KE",
};

// Response fields masked in console logs.
// Fields masked in console logs ("code" is the one-time launch code).
export const SECRET_KEYS = new Set(["accessToken", "session_token", "app_secret", "code", "launchCode", "launchToken"]);
