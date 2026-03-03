import { z } from "zod";
import { compile } from "#src/compile.js";

const TransformSchema = z.object({
  name: z.string(),
  value: z.string().transform((v) => Number.parseInt(v, 10)),
});

export const validateTransform = compile(TransformSchema);
