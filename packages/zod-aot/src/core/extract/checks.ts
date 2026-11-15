import type {
  CheckMaxSize,
  CheckMinSize,
  FallbackIR,
  LengthCheckIR,
  RefineEffectCheckIR,
  SchemaIR,
} from "../types.js";
import { tryCompileEffect } from "./effects.js";
import type {
  CheckedExtractor,
  ExtractorContext,
  ZodCheckDef,
  ZodCheckSchema,
  ZodDef,
} from "./types.js";

export type CheckFallbackReason = Extract<FallbackIR["reason"], "refine" | "unsupported">;

/**
 * Maps one Zod check to the owning type's check IR, or to the reason the schema
 * must fall back. Mappers return "unsupported" for every kind they don't
 * implement: `.check()` can attach any check to any schema (e.g.
 * `z.string().check(z.gte(1))`), and skipping one would silently drop it.
 */
export type CheckMapper<T> = (def: ZodCheckDef, check: ZodCheckSchema) => T | CheckFallbackReason;

/**
 * Pair a mapper with the extractor that consumes its output. `C` links the two
 * at construction, so the registry can store the type-erased entry safely.
 */
export function checkedExtractor<C>(
  mapCheck: CheckMapper<C>,
  extract: (def: ZodDef, ctx: ExtractorContext, checks: C[]) => SchemaIR,
): CheckedExtractor<unknown> {
  return { mapCheck, extract: (def, ctx, checks) => extract(def, ctx, checks as C[]) };
}

export function extractChecks<T>(
  checks: readonly ZodCheckSchema[],
  mapCheck: CheckMapper<T>,
): { checkIRs: T[]; fallback: CheckFallbackReason | null } {
  const checkIRs: T[] = [];
  for (const check of checks) {
    const def = check._zod?.def;
    if (!def) continue;
    const ir = mapCheck(def, check);
    if (isFallbackReason(ir)) return { checkIRs, fallback: ir };
    checkIRs.push(ir);
  }
  return { checkIRs, fallback: null };
}

function isFallbackReason(value: unknown): value is CheckFallbackReason {
  return value === "refine" || value === "unsupported";
}

/** `.refine(fn)`: compiled when `fn` is zero-capture, otherwise a "refine" fallback. */
export function mapRefineCheck(def: ZodCheckDef): RefineEffectCheckIR | CheckFallbackReason {
  if (def.check !== "custom") return "unsupported";
  const source = tryCompileEffect(def.fn);
  if (!source) return "refine";
  const message = typeof def.error === "function" ? extractRefineMessage(def.error) : undefined;
  return { kind: "refine_effect", source, ...(message ? { message } : {}) };
}

/** `.min()` / `.max()` / `.length()` on strings and arrays. */
export function mapLengthCheck(def: ZodCheckDef): LengthCheckIR | undefined {
  switch (def.check) {
    case "min_length":
      return { kind: "min_length", minimum: def.minimum };
    case "max_length":
      return { kind: "max_length", maximum: def.maximum };
    case "length_equals":
      return { kind: "length_equals", length: def.length };
    default:
      return undefined;
  }
}

/** `.min()` / `.max()` on sets and files. */
export function mapSizeCheck(def: ZodCheckDef): CheckMinSize | CheckMaxSize | undefined {
  if (def.check === "min_size") return { kind: "min_size", minimum: def.minimum };
  if (def.check === "max_size") return { kind: "max_size", maximum: def.maximum };
  return undefined;
}

/**
 * For types whose codegen has no refine support (bigint, date, set, file): a
 * refine falls back as "refine" even when zero-capture, matching the reason a
 * plain-extractor type reports.
 */
export function uncompiledCheckReason(def: ZodCheckDef): CheckFallbackReason {
  return def.check === "custom" ? "refine" : "unsupported";
}

function extractRefineMessage(errorFn: (...args: unknown[]) => unknown): string | undefined {
  try {
    const result = errorFn({});
    return typeof result === "string" ? result : undefined;
  } catch {
    return undefined;
  }
}
