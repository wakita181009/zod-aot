import { z } from "zod";
import { compile } from "zod-aot";

const UserSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive(),
  email: z.email(),
});

export const validateUser = compile(UserSchema);
