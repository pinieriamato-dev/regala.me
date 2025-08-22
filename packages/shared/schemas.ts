import { z } from 'zod';

export const CreateWishlistSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  visibility: z.enum(['public', 'private']).default('public'),
  allow_reservations: z.boolean().default(true),
  notify_on_purchase: z.boolean().default(true)
});

export const CreateItemSchema = z.object({
  wishlistId: z.string().uuid(),
  url: z.string().url().optional(),
  title: z.string().optional(),
  note: z.string().optional()
});

export const ReserveItemSchema = z.object({
  email: z.string().email().optional()
});

export const PurchasedSchema = z.object({});

export const CreateGiftcardOrderSchema = z.object({
  productId: z.string(),
  amountCents: z.number(),
  currency: z.string().length(3),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  message: z.string().optional(),
  wishlistId: z.string().uuid().optional()
});

export type CreateWishlist = z.infer<typeof CreateWishlistSchema>;
export type CreateItem = z.infer<typeof CreateItemSchema>;
export type ReserveItem = z.infer<typeof ReserveItemSchema>;
export type CreateGiftcardOrder = z.infer<typeof CreateGiftcardOrderSchema>;
