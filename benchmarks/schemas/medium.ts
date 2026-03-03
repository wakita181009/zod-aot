import { z } from "zod";

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
