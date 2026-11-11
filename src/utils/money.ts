export const SHIPPING_FEE_CENTS = Number(
  process.env.SHIPPING_FEE_CENTS ?? 500,
);

export const FREE_SHIPPING_THRESHOLD_CENTS = Number(
  process.env.FREE_SHIPPING_THRESHOLD_CENTS ?? 5000,
);

export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function shippingFor(subtotalCents: number): number {
  if (subtotalCents <= 0) {
    return 0;
  }
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
    ? 0
    : SHIPPING_FEE_CENTS;
}

// WasaaChat Pay accepts at most KES 100,000.00 per payment intent.
// https://wasaachat.com/developers/payments
export const MAX_WASAA_PAYMENT_CENTS = 10_000_000;

export const exceedsWasaaPaymentLimit = (totalCents: number) => totalCents > MAX_WASAA_PAYMENT_CENTS;
