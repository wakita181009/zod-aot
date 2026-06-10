import { NameSchema } from "@pkgs/shared/name";
import { z } from "zod";

export const UserSchema = z.object({
  name: NameSchema,
  age: z.number().int().positive(),
});
