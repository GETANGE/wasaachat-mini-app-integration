import { z } from "zod";

export const shippingAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().min(1).max(30),
  country: z.string().trim().min(2).max(2).toUpperCase(),
});

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "paid",
    "shipped",
    "delivered",
    "cancelled",
  ]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

// POST /api/orders/:id/payment/confirm — the intent id WasaaChat returned.
export const confirmPaymentSchema = z.object({
  intentId: z.string().trim().min(1).max(128),
});
