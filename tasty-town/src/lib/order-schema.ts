import { z } from "zod";

export const lineSchema = z.object({
  id: z.string().min(1).max(64),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  addonIds: z.array(z.string().uuid()).max(20).optional(),
  quantity: z.number().int(),
  notes: z.string().max(200).optional(),
});

export const quoteSchema = z.object({
  lines: z.array(lineSchema).min(1).max(30),
  orderType: z.enum(["delivery", "takeaway"]),
  coupon: z.string().trim().max(40).optional(),
});

export const orderSchema = quoteSchema.extend({
  idempotencyKey: z.string().min(8).max(100),
  customerName: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z.string().trim().min(1, "Enter your mobile number."),
  address: z.object({ line1: z.string().trim().max(200), landmark: z.string().trim().max(120) }).optional(),
  instructions: z.string().trim().max(300).optional(),
  expectedTotalPaise: z.number().int().min(0),
});
