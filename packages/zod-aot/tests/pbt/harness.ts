/**
 * PBT (Property-Based Testing) harness for zod-aot.
 *
 * Core differential testing: compile a Zod schema through the AOT pipeline,
 * then assert that the generated validator produces identical results to Zod
 * for any input.
 *
 * Correctness hierarchy:
 *   1. success/failure must match
 *   2. On success: data must deep-equal
 *   3. On failure: normalized issues must match
 */

import { expect } from "vitest";
import { ZodRealError, z } from "zod";
import { generateValidator } from "#src/core/codegen/index.js";
import type { FallbackEntry } from "#src/core/extract/index.js";
import { extractSchema } from "#src/core/extract/index.js";

type SafeParseFn = (input: unknown) => {
  success: boolean;
  data?: unknown;
  error?: { issues: Record<string, unknown>[] };
};

/**
 * Compile a Zod schema through the full AOT pipeline: extract IR → generate code → eval.
 * Returns a safeParse function that behaves identically to zodSchema.safeParse().
 *
 * Handles fallback schemas (__fb[]) for schemas with non-compilable parts
 * (captured-variable transforms, superRefine, etc.).
 */
export function compileFromZod(zodSchema: z.ZodType, name = "pbt"): SafeParseFn {
  const fallbackEntries: FallbackEntry[] = [];
  const ir = extractSchema(zodSchema, fallbackEntries);
  const result = generateValidator(ir, name, { fallbackCount: fallbackEntries.length });
  // biome-ignore lint/style/noNonNullAssertion: localeError is always set in Zod v4
  const __msg = z.config().localeError!;
  const fallbackSchemas = fallbackEntries.map((e) => e.schema);

  const fn =
    fallbackSchemas.length > 0
      ? new Function("__msg", "__ZodError", "__fb", `${result.code}\nreturn ${result.functionDef};`)
      : new Function("__msg", "__ZodError", `${result.code}\nreturn ${result.functionDef};`);

  return (
    fallbackSchemas.length > 0 ? fn(__msg, ZodRealError, fallbackSchemas) : fn(__msg, ZodRealError)
  ) as SafeParseFn;
}

/**
 * Normalize Zod issues for comparison by stripping non-deterministic fields.
 *
 * Strips: message, input, origin, inst, continue
 * Preserves: code, path, minimum, maximum, expected, received, inclusive, exact, type
 *
 * Combines patterns from integration.test.ts (stripMessage) and
 * compat.test.ts (normalizeIssues).
 */
export function normalizeIssues(issues: Record<string, unknown>[]): Record<string, unknown>[] {
  return issues.map((issue) => {
    const normalized = { ...issue };
    delete normalized["message"];
    delete normalized["input"];
    delete normalized["origin"];
    delete normalized["inst"];
    delete normalized["continue"];
    return normalized;
  });
}

export interface ParityOptions {
  /**
   * When true, also check that error issues match structurally (not just success/failure).
   *
   * Known divergence: AOT uses if/else for type checks (e.g., typeof !== "string" → skip
   * length checks), so it may report fewer issues than Zod on type-mismatched inputs.
   * This is an intentional optimization, not a bug. Enable strict mode when testing
   * schemas with type-matched inputs only (Phase 2+ IR-driven arbitraries).
   */
  strictIssues?: boolean;
}

/**
 * Assert that a generated validator produces identical results to Zod
 * for a given input.
 *
 * Default parity check (Levels 1-2):
 *   1. success/failure must match
 *   2. On success: data must deep-equal (catches coerce/default/transform bugs)
 *
 * With strictIssues (Level 3):
 *   3. On failure: normalized issues must match (catches error reporting bugs)
 */
export function assertParity(
  zodSchema: z.ZodType,
  generatedSafeParse: SafeParseFn,
  input: unknown,
  options?: ParityOptions,
): void {
  const zodResult = zodSchema.safeParse(input);

  // AOT generated code may throw on inputs that Zod handles gracefully
  // (e.g., Number(Symbol()) throws TypeError, but Zod catches it internally).
  // When AOT throws, treat it as failure and compare with Zod's result.
  let aotResult: ReturnType<SafeParseFn>;
  try {
    aotResult = generatedSafeParse(input);
  } catch {
    // AOT threw — Zod should also fail for this input.
    // If Zod succeeds but AOT throws, that's a real bug worth investigating.
    if (zodResult.success) {
      expect.unreachable(`AOT threw but Zod succeeded for input: ${String(input)}`);
    }
    return; // Both failed (Zod via error result, AOT via exception). Acceptable divergence.
  }

  // Level 1: success/failure must match
  expect(aotResult.success).toBe(zodResult.success);

  // Level 2: on success, data must deep-equal
  if (zodResult.success && aotResult.success) {
    expect(aotResult.data).toEqual(zodResult.data);
  }

  // Level 3 (optional): on failure, normalized issues must match
  if (options?.strictIssues && !zodResult.success && !aotResult.success) {
    const zodIssues = normalizeIssues(
      zodResult.error.issues as unknown as Record<string, unknown>[],
    );
    const aotIssues = normalizeIssues(aotResult.error?.issues ?? []);
    expect(aotIssues).toEqual(zodIssues);
  }
}
