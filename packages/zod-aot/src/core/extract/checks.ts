import type { CheckOrEffectIR, FallbackIR } from "../types.js";
import { tryCompileEffect } from "./effects.js";
import type { ZodCheckDef, ZodCheckSchema } from "./types.js";

export type CheckFallbackReason = Extract<FallbackIR["reason"], "refine" | "unsupported">;

/**
 * String formats whose Zod check is exactly `def.pattern.test(value)` in every
 * supported Zod version (4.0–4.6). Other formats (ipv6, cidrv6, base64,
 * base64url, jwt, credit_card, iban, custom stringFormat, ...) override
 * `_zod.check` with logic a regex cannot reproduce, so they fall back.
 * Keep this an allowlist: a format Zod adds later must not compile by default.
 */
const PATTERN_ONLY_FORMATS = new Set([
  "email",
  "uuid",
  "guid",
  "emoji",
  "nanoid",
  "cuid",
  "cuid2",
  "ulid",
  "xid",
  "ksuid",
  "datetime",
  "date",
  "time",
  "duration",
  "ipv4",
  "cidrv4",
  "e164",
  "mac",
  "lowercase",
  "uppercase",
  "regex",
]);

/** Fallback reason for a check that a type-specific extractor cannot compile. */
export function unsupportedCheckReason(def: ZodCheckDef): CheckFallbackReason {
  return def.check === "custom" ? "refine" : "unsupported";
}

/**
 * Zod check kinds each type's codegen implements (`custom` is always accepted).
 * `.check()` can attach any check to any schema, e.g. `z.string().check(z.gte(1))`,
 * so kinds outside the owning type's set must fall back rather than be skipped.
 */
export const STRING_CHECK_KINDS: ReadonlySet<string> = new Set([
  "min_length",
  "max_length",
  "length_equals",
  "string_format",
  "overwrite",
]);
export const NUMBER_CHECK_KINDS: ReadonlySet<string> = new Set([
  "greater_than",
  "less_than",
  "multiple_of",
  "number_format",
]);
export const ARRAY_CHECK_KINDS: ReadonlySet<string> = new Set([
  "min_length",
  "max_length",
  "length_equals",
]);
export const OBJECT_CHECK_KINDS: ReadonlySet<string> = new Set();

export function extractChecks(
  checks: ZodCheckSchema[],
  kinds: ReadonlySet<string>,
): {
  checkIRs: CheckOrEffectIR[];
  fallback: CheckFallbackReason | null;
} {
  const checkIRs: CheckOrEffectIR[] = [];

  for (const check of checks) {
    const def = check._zod?.def;
    if (!def) continue;
    if (def.check !== "custom" && !kinds.has(def.check)) {
      return { checkIRs, fallback: "unsupported" };
    }
    const ir = extractCheck(def);
    if (typeof ir === "string") return { checkIRs, fallback: ir };
    checkIRs.push(ir);
  }

  return { checkIRs, fallback: null };
}

function extractCheck(def: ZodCheckDef): CheckOrEffectIR | CheckFallbackReason {
  switch (def.check) {
    case "min_length":
      return { kind: "min_length", minimum: def.minimum };
    case "max_length":
      return { kind: "max_length", maximum: def.maximum };
    case "length_equals":
      return { kind: "length_equals", length: def.length };
    case "greater_than":
      return { kind: "greater_than", value: def.value, inclusive: def.inclusive };
    case "less_than":
      return { kind: "less_than", value: def.value, inclusive: def.inclusive };
    case "multiple_of":
      return { kind: "multiple_of", value: def.value };
    case "number_format":
      return {
        kind: "number_format",
        format: def.format as "safeint" | "int32" | "uint32" | "float32" | "float64",
      };
    case "string_format":
      return extractStringFormat(def);
    case "overwrite": {
      const source = tryCompileEffect(def.tx);
      return source ? { kind: "overwrite_effect", source } : "unsupported";
    }
    case "custom": {
      const source = tryCompileEffect(def.fn);
      if (!source) return "refine";
      const message = typeof def.error === "function" ? extractRefineMessage(def.error) : undefined;
      return { kind: "refine_effect", source, ...(message ? { message } : {}) };
    }
    default:
      return "unsupported";
  }
}

function extractStringFormat(def: ZodCheckDef): CheckOrEffectIR | CheckFallbackReason {
  if (def.format === "includes" && typeof def.includes === "string") {
    return {
      kind: "includes",
      includes: def.includes,
      ...(typeof def.position === "number" ? { position: def.position } : {}),
    };
  }
  if (def.format === "starts_with" && typeof def.prefix === "string") {
    return { kind: "starts_with", prefix: def.prefix };
  }
  if (def.format === "ends_with" && typeof def.suffix === "string") {
    return { kind: "ends_with", suffix: def.suffix };
  }
  if (def.format === "url") {
    if (def.hostname || def.protocol || def.normalize) return "unsupported";
    return { kind: "string_format", format: "url" };
  }
  if (!PATTERN_ONLY_FORMATS.has(def.format)) return "unsupported";

  const pattern = def.pattern;
  if (typeof pattern === "string") return { kind: "string_format", format: def.format, pattern };
  if (!(pattern instanceof RegExp)) return "unsupported";
  // A stateful (g/y) regex reused across calls would carry lastIndex between inputs.
  if (pattern.global || pattern.sticky) return "unsupported";
  return {
    kind: "string_format",
    format: def.format,
    pattern: pattern.source,
    ...(pattern.flags ? { flags: pattern.flags } : {}),
  };
}

function extractRefineMessage(errorFn: (...args: unknown[]) => unknown): string | undefined {
  try {
    const result = errorFn({});
    return typeof result === "string" ? result : undefined;
  } catch {
    return undefined;
  }
}
