export type {
  SchemaIR,
  CheckIR,
  CompiledSchema,
  SafeParseResult,
  SafeParseSuccess,
  SafeParseError,
  ZodIssueLike,
  ZodErrorLike,
} from "./types.js";

export { extractSchema } from "./extractor/index.js";
export { generateValidator } from "./codegen/index.js";
export type { CodeGenResult } from "./codegen/index.js";
export { createFallback } from "./runtime.js";
