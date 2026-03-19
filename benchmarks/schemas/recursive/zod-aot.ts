import { compile } from "zod-aot";
import { TreeNodeSchema } from "./zod.js";

export const aotTree = compile(TreeNodeSchema);
