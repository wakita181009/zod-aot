// biome-ignore lint/correctness/noUnusedImports: needed in source text for readFixtureAsUserCode bail-out
import { z } from "zod";
// biome-ignore lint/correctness/noUnusedImports: needed in source text for readFixtureAsUserCode bail-out
import { compile } from "#src/core/compile.js";

// Manually create broken compiled schemas that pass isCompiledSchema
// but fail during extractSchema (schema property is null)
const broken1 = { schema: null };
Object.defineProperty(broken1, Symbol.for("zod-aot:compiled"), {
  value: true,
  enumerable: false,
});

const broken2 = { schema: null };
Object.defineProperty(broken2, Symbol.for("zod-aot:compiled"), {
  value: true,
  enumerable: false,
});

export const brokenA = broken1;
export const brokenB = broken2;
