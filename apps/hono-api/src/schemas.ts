import { z } from "zod";
import { compile } from "zod-aot";

// --- User ---

export const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(0).max(150),
  role: z.enum(["admin", "editor", "viewer"]),
});

// --- Query params ---

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  role: z.enum(["admin", "editor", "viewer"]).optional(),
});

// --- Path params ---

export const UserParamSchema = z.object({
  id: z.string().min(1),
});

// --- Headers ---

export const ApiHeaderSchema = z.object({
  "x-api-key": z.string().min(1),
});

// --- Compiled versions (zodCompat=true by default) ---

export const CompiledCreateUserSchema = compile(CreateUserSchema);
export const CompiledListUsersQuerySchema = compile(ListUsersQuerySchema);
export const CompiledUserParamSchema = compile(UserParamSchema);
export const CompiledApiHeaderSchema = compile(ApiHeaderSchema);
