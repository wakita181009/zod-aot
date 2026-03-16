import { z } from "zod";
import { compile } from "zod-aot";

// --- User ---

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const validateUser = compile(CreateUserSchema);

// --- Product ---

export const ProductSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  price: z.number().positive(),
  tags: z.array(z.string()),
  inStock: z.boolean(),
});

export const validateProduct = compile(ProductSchema);
