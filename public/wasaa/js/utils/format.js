const money = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" });
const wholeMoney = new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 });

const dateTime = new Intl.DateTimeFormat("en-KE", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// "Ksh 7,999" for whole amounts, "Ksh 7,999.50" otherwise.
export function formatMoney(value) {
  const n = Number(value ?? 0);
  return Number.isInteger(n) ? wholeMoney.format(n) : money.format(n);
}

export const formatDate = (value) => (value ? dateTime.format(new Date(value)) : "");

export const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

// Stable 0–3 bucket per string, used to colour image placeholders.
export function toneFor(text) {
  let hash = 0;
  for (const ch of String(text)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return String(hash % 4);
}
