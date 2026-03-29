import { z } from "zod";
import { compile } from "zod-aot";

// --- User ---

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["admin", "editor", "viewer"]),
});

export const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
});

// --- Query params ---

export const ListUsersSchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
});

// --- Path params ---

export const UserIdSchema = z.object({
  id: z.string().min(1),
});

// --- Compiled versions (zodCompat=true by default) ---

export const CompiledCreateUserSchema = compile(CreateUserSchema);
export const CompiledUpdateUserSchema = compile(UpdateUserSchema);
export const CompiledListUsersSchema = compile(ListUsersSchema);
export const CompiledUserIdSchema = compile(UserIdSchema);
