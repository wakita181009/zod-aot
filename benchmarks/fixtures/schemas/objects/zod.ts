import { z } from "zod";

// ─── Medium: User Registration ──────────────────────────────────────────────

export const UserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.email(),
  password: z.string().min(8),
  age: z.number().int().positive(),
  role: z.enum(["user", "admin"]),
  newsletter: z.boolean(),
  referral: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

// ─── Large: API Response (nested objects + arrays) ──────────────────────────

const ItemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().min(1)).max(10),
  published: z.boolean(),
  category: z.enum(["tech", "science", "art", "music", "sports"]),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    views: z.number().int().nonnegative(),
  }),
});

export const ApiResponseSchema = z.object({
  status: z.enum(["success", "error"]),
  data: z
    .object({
      items: z.array(ItemSchema),
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      hasMore: z.boolean(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type ApiResponse = z.infer<typeof ApiResponseSchema>;
