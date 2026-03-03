import type { CheckIR, SchemaIR } from "../types.js";

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
}

interface ZodSchema {
  _zod: {
    def: ZodDef;
    bag?: Record<string, unknown>;
  };
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

/**
 * Extract SchemaIR from a Zod schema by traversing its `_zod.def` and `_zod.bag`.
 */
export function extractSchema(zodSchema: unknown): SchemaIR {
  const schema = zodSchema as ZodSchema;
  const def = schema._zod.def;

  // Transform: pipe with transform output
  if (def.type === "pipe") {
    const outDef = def.out?._zod?.def;
    if (outDef && outDef.type === "transform") {
      return { type: "fallback", reason: "transform" };
    }
    return { type: "fallback", reason: "unsupported" };
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
      if (hasFallback) return { type: "fallback", reason: "refine" };
      return { type: "string", checks: checkIRs };
    }

    case "number": {
      if (!def.checks || def.checks.length === 0) {
        return { type: "number", checks: [] };
      }
      const { checkIRs, hasFallback } = extractChecks(def.checks);
      if (hasFallback) return { type: "fallback", reason: "refine" };
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
        properties[key] = extractSchema(value);
      }
      return { type: "object", properties };
    }

    case "array": {
      const element = extractSchema(def.element);
      const { checkIRs } = def.checks ? extractChecks(def.checks) : { checkIRs: [] };
      return { type: "array", element, checks: checkIRs };
    }

    case "union":
      return {
        type: "union",
        options: def.options.map((opt) => extractSchema(opt)),
      };

    case "optional":
      return { type: "optional", inner: extractSchema(def.innerType) };

    case "nullable":
      return { type: "nullable", inner: extractSchema(def.innerType) };

    default:
      return { type: "fallback", reason: "unsupported" };
  }
}
