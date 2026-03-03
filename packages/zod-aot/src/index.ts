export type { CodeGenResult } from "#src/core/codegen/index.js";
export { generateValidator } from "#src/core/codegen/index.js";
export { compile, isCompiledSchema } from "#src/core/compile.js";
export type { FallbackEntry } from "#src/core/extractor.js";
export { extractSchema } from "#src/core/extractor.js";
export { createFallback } from "#src/core/runtime.js";
export type {
  CheckIR,
  CompiledSchema,
  DateCheckIR,
  SafeParseError,
  SafeParseResult,
  SafeParseSuccess,
  SchemaIR,
  ZodErrorLike,
  ZodIssueLike,
} from "#src/core/types.js";
export { unplugin } from "#src/unplugin/index.js";
export type { ZodAotPluginOptions } from "#src/unplugin/types.js";
