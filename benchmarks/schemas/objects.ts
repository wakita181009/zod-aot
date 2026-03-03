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

export const validUser: User = {
  username: "alice_dev",
  email: "alice@example.com",
  password: "securepass123",
  age: 28,
  role: "user",
  newsletter: true,
  referral: "bob",
};

export const invalidUser = {
  username: "ab",
  email: "not-email",
  password: "short",
  age: -1,
  role: "superadmin",
  newsletter: "yes",
};

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

function makeItem(i: number) {
  return {
    id: i + 1,
    title: `Item ${i + 1}`,
    description: `Description for item ${i + 1}`,
    tags: ["tag1", "tag2"],
    published: true,
    category: "tech" as const,
    metadata: {
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-06-01T00:00:00Z",
      views: i * 100,
    },
  };
}

export const validApiResponse10: ApiResponse = {
  status: "success",
  data: {
    items: Array.from({ length: 10 }, (_, i) => makeItem(i)),
    total: 100,
    page: 1,
    pageSize: 10,
    hasMore: true,
  },
};

export const validApiResponse100: ApiResponse = {
  status: "success",
  data: {
    items: Array.from({ length: 100 }, (_, i) => makeItem(i)),
    total: 1000,
    page: 1,
    pageSize: 100,
    hasMore: true,
  },
};
