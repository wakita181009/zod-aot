import { z } from "zod";
import { compile } from "#src/core/compile.js";

const MultiTransformSchema = z.object({
  name: z.string().transform((v) => v.toUpperCase()),
  value: z.string().transform((v) => Number.parseInt(v, 10)),
  label: z.string(),
});

export const validateMulti = compile(MultiTransformSchema);
