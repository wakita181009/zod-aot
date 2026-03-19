import { compile } from "zod-aot";
import { DiscriminatedUnionSchema } from "./zod.js";

export const aotDiscUnion = compile(DiscriminatedUnionSchema);
