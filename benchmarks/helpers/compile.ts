import type { CompiledSchema, FallbackEntry, SafeParseResult } from "zod-aot";
import { extractSchema, generateValidator } from "zod-aot";

/**
 * Compile a Zod schema into an AOT-optimized validator for benchmarking.
 * Pre-compiles at setup time (amortized — this cost happens at build time in real usage).
 */
export function compileForBench<T>(zodSchema: unknown, name: string): CompiledSchema<T> {
  const fallbackEntries: FallbackEntry[] = [];
  const ir = extractSchema(zodSchema, fallbackEntries);
  const result = generateValidator(ir, name, { fallbackCount: fallbackEntries.length });

  const fallbackSchemas = fallbackEntries.map((e) => e.schema);
  const safeParseFn =
    fallbackSchemas.length > 0
      ? (new Function("__fb", `${result.code}\nreturn ${result.functionName};`)(
          fallbackSchemas,
        ) as (input: unknown) => SafeParseResult<T>)
      : (new Function(`${result.code}\nreturn ${result.functionName};`)() as (
          input: unknown,
        ) => SafeParseResult<T>);

  return {
    parse(input: unknown): T {
      const r = safeParseFn(input);
      if (r.success) return r.data;
      throw new Error(`Validation failed: ${JSON.stringify(r.error)}`);
    },
    safeParse(input: unknown): SafeParseResult<T> {
      return safeParseFn(input);
    },
    is(input: unknown): input is T {
      return safeParseFn(input).success;
    },
    schema: zodSchema,
  };
}
