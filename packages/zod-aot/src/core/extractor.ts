import type { CheckIR, DateCheckIR, FallbackIR, SchemaIR } from "./types.js";

interface ZodCheckDef {
  check: string;
  minimum: number;
  maximum: number;
  length: number;
  value: number;
  inclusive: boolean;
  format: string;
  pattern: RegExp | string;
  type: string;
  fn: unknown;
}

interface ZodCheckSchema {
  _zod?: {
    def: ZodCheckDef;
  };
}

interface ZodDef {
  type: string;
  checks: ZodCheckSchema[];
  check: string;
  format: string;
  pattern: RegExp | string;
  shape: Record<string, ZodSchema>;
  element: ZodSchema;
  options: ZodSchema[];
  innerType: ZodSchema;
  values: (string | number | boolean | null)[];
  entries: Record<string, string>;
  in: ZodSchema;
  out: ZodSchema;
  items: ZodSchema[];
  rest: ZodSchema | null;
  keyType: ZodSchema;
  valueType: ZodSchema;
  left: ZodSchema;
  right: ZodSchema;
  discriminator: string;
  defaultValue: unknown;
}

interface ZodSchema {
  _zod: {
    def: ZodDef;
    bag?: Record<string, unknown>;
  };
}

/** Entry collected during extraction for each fallback sub-schema. */
export interface FallbackEntry {
  /** Runtime reference to the Zod sub-schema. */
  schema: unknown;
  /** Navigation path from root schema, e.g. '.shape["slug"]' */
  accessPath: string;
}

function extractChecks(checks: ZodCheckSchema[]): { checkIRs: CheckIR[]; hasFallback: boolean } {
  const checkIRs: CheckIR[] = [];
  let hasFallback = false;

  for (const check of checks) {
    const def = check._zod?.def;
    if (!def) continue;

    switch (def.check) {
      case "min_length":
        checkIRs.push({ kind: "min_length", minimum: def.minimum });
        break;
      case "max_length":
        checkIRs.push({ kind: "max_length", maximum: def.maximum });
        break;
      case "length_equals":
        checkIRs.push({ kind: "length_equals", length: def.length });
        break;
      case "greater_than":
        checkIRs.push({ kind: "greater_than", value: def.value, inclusive: def.inclusive });
        break;
      case "less_than":
        checkIRs.push({ kind: "less_than", value: def.value, inclusive: def.inclusive });
        break;
      case "multiple_of":
        checkIRs.push({ kind: "multiple_of", value: def.value });
        break;
      case "number_format":
        checkIRs.push({
          kind: "number_format",
          format: def.format as "safeint" | "int32" | "uint32" | "float32" | "float64",
        });
        break;
      case "string_format": {
        const pattern = def.pattern instanceof RegExp ? def.pattern.source : def.pattern;
        checkIRs.push({
          kind: "string_format",
          format: def.format,
          ...(pattern ? { pattern } : {}),
        });
        break;
      }
      case "custom":
        hasFallback = true;
        break;
    }
  }

  return { checkIRs, hasFallback };
}

function makeFallback(
  reason: FallbackIR["reason"],
  zodSchema: unknown,
  fallbacks?: FallbackEntry[],
  accessPath?: string,
): FallbackIR {
  if (fallbacks && accessPath !== undefined) {
    const index = fallbacks.length;
    fallbacks.push({ schema: zodSchema, accessPath });
    return { type: "fallback", reason, fallbackIndex: index };
  }
  return { type: "fallback", reason };
}

/**
 * Extract SchemaIR from a Zod schema by traversing its `_zod.def` and `_zod.bag`.
 *
 * When `fallbacks` is provided, non-compilable sub-schemas are collected with their
 * access paths for partial fallback (Zod delegation at runtime).
 */
export function extractSchema(
  zodSchema: unknown,
  fallbacks?: FallbackEntry[],
  currentPath?: string,
): SchemaIR {
  const schema = zodSchema as ZodSchema;
  const def = schema._zod.def;
  const p = currentPath ?? "";

  // Transform: pipe with transform output
  if (def.type === "pipe") {
    const outDef = def.out?._zod?.def;
    if (outDef && outDef.type === "transform") {
      return makeFallback("transform", zodSchema, fallbacks, p);
    }
    return makeFallback("unsupported", zodSchema, fallbacks, p);
  }

  // String format schemas (z.email(), z.url(), z.uuid())
  if (def.type === "string" && def.check === "string_format") {
    const pattern = def.pattern instanceof RegExp ? def.pattern.source : def.pattern;
    const checks: CheckIR[] = [
      {
        kind: "string_format",
        format: def.format,
        ...(pattern ? { pattern } : {}),
      },
    ];
    return { type: "string", checks };
  }

  switch (def.type) {
    case "string": {
      if (!def.checks || def.checks.length === 0) {
        return { type: "string", checks: [] };
      }
      const { checkIRs, hasFallback } = extractChecks(def.checks);
      if (hasFallback) return makeFallback("refine", zodSchema, fallbacks, p);
      return { type: "string", checks: checkIRs };
    }

    case "number": {
      if (!def.checks || def.checks.length === 0) {
        return { type: "number", checks: [] };
      }
      const { checkIRs, hasFallback } = extractChecks(def.checks);
      if (hasFallback) return makeFallback("refine", zodSchema, fallbacks, p);
      return { type: "number", checks: checkIRs };
    }

    case "boolean":
      return { type: "boolean" };

    case "null":
      return { type: "null" };

    case "undefined":
      return { type: "undefined" };

    case "literal":
      return { type: "literal", values: def.values };

    case "enum":
      return { type: "enum", values: Object.values(def.entries) };

    case "object": {
      const properties: Record<string, SchemaIR> = {};
      for (const [key, value] of Object.entries(def.shape)) {
        const propPath = `${p}.shape[${JSON.stringify(key)}]`;
        properties[key] = extractSchema(value, fallbacks, propPath);
      }
      return { type: "object", properties };
    }

    case "array": {
      const element = extractSchema(def.element, fallbacks, `${p}._zod.def.element`);
      const { checkIRs } = def.checks ? extractChecks(def.checks) : { checkIRs: [] };
      return { type: "array", element, checks: checkIRs };
    }

    case "union": {
      if (def.discriminator) {
        const options = def.options.map((opt, i) =>
          extractSchema(opt, fallbacks, `${p}._zod.def.options[${i}]`),
        );
        const mapping: Record<string, number> = {};
        for (let i = 0; i < def.options.length; i++) {
          const opt = def.options[i] as ZodSchema;
          const optDef = opt._zod.def;
          if (optDef.type === "object" && optDef.shape) {
            const discrimField = optDef.shape[def.discriminator];
            if (discrimField?._zod?.def?.type === "literal") {
              const vals = discrimField._zod.def.values as (string | number | boolean)[];
              for (const v of vals) {
                mapping[String(v)] = i;
              }
            }
          }
        }
        return { type: "discriminatedUnion", discriminator: def.discriminator, options, mapping };
      }
      return {
        type: "union",
        options: def.options.map((opt, i) =>
          extractSchema(opt, fallbacks, `${p}._zod.def.options[${i}]`),
        ),
      };
    }

    case "optional":
      return {
        type: "optional",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`),
      };

    case "nullable":
      return {
        type: "nullable",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`),
      };

    case "any":
      return { type: "any" };

    case "unknown":
      return { type: "unknown" };

    case "readonly":
      return {
        type: "readonly",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`),
      };

    case "date": {
      const dateChecks: DateCheckIR[] = [];
      if (def.checks) {
        for (const check of def.checks) {
          const checkDef = check._zod?.def;
          if (!checkDef) continue;
          if (checkDef.check === "greater_than") {
            const v = checkDef.value as unknown as string;
            const ts = new Date(v).getTime();
            if (Number.isNaN(ts)) continue;
            dateChecks.push({
              kind: "date_greater_than",
              value: String(v),
              timestamp: ts,
              inclusive: checkDef.inclusive,
            });
          } else if (checkDef.check === "less_than") {
            const v = checkDef.value as unknown as string;
            const ts = new Date(v).getTime();
            if (Number.isNaN(ts)) continue;
            dateChecks.push({
              kind: "date_less_than",
              value: String(v),
              timestamp: ts,
              inclusive: checkDef.inclusive,
            });
          }
        }
      }
      return { type: "date", checks: dateChecks };
    }

    case "tuple": {
      const items = def.items.map((item, i) =>
        extractSchema(item, fallbacks, `${p}._zod.def.items[${i}]`),
      );
      const rest = def.rest ? extractSchema(def.rest, fallbacks, `${p}._zod.def.rest`) : null;
      return { type: "tuple", items, rest };
    }

    case "record": {
      if (!def.valueType) {
        return makeFallback("unsupported", zodSchema, fallbacks, p);
      }
      const keyType = extractSchema(def.keyType, fallbacks, `${p}._zod.def.keyType`);
      const valueType = extractSchema(def.valueType, fallbacks, `${p}._zod.def.valueType`);
      return { type: "record", keyType, valueType };
    }

    case "default": {
      const inner = extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`);
      const defaultValue = def.defaultValue;
      // Date objects serialize to strings via JSON.stringify, losing their type.
      // Fall back to Zod for Date defaults to preserve correct runtime behavior.
      if (defaultValue instanceof Date) {
        return makeFallback("unsupported", zodSchema, fallbacks, p);
      }
      try {
        JSON.stringify(defaultValue);
      } catch {
        return makeFallback("unsupported", zodSchema, fallbacks, p);
      }
      return { type: "default", inner, defaultValue };
    }

    case "intersection":
      return {
        type: "intersection",
        left: extractSchema(def.left, fallbacks, `${p}._zod.def.left`),
        right: extractSchema(def.right, fallbacks, `${p}._zod.def.right`),
      };

    default:
      return makeFallback("unsupported", zodSchema, fallbacks, p);
  }
}
