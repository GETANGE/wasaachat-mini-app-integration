import { DEFAULT_ADDRESS, SIGNED_OUT_KEY, STORAGE_KEYS } from "../config.js";

// localStorage can throw (private mode, blocked site data); none of this is
// critical, so failures fall back silently.
function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export const loadAddress = () => ({ ...DEFAULT_ADDRESS, ...read(STORAGE_KEYS.address, {}) });

export const saveAddress = (address) => write(STORAGE_KEYS.address, address);

// Wishlist lives on the device: an array of product snapshots
// { id, slug, name, price, compareAtPrice, image }.
export const loadWishlist = () => {
  const items = read(STORAGE_KEYS.wishlist, []);
  return Array.isArray(items) ? items : [];
};

export const saveWishlist = (items) => write(STORAGE_KEYS.wishlist, items);

export const isSignedOut = () => read(SIGNED_OUT_KEY, false) === true;

export function setSignedOut(value) {
  if (value) write(SIGNED_OUT_KEY, true);
  else {
    try {
      localStorage.removeItem(SIGNED_OUT_KEY);
    } catch {
      /* storage unavailable */
    }
  }
}

// Removes everything the shop saved on this device (used when signing out).
export function clearDeviceData() {
  for (const key of Object.values(STORAGE_KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  }
}
