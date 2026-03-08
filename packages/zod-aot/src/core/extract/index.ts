import type { SchemaIR } from "../types.js";
import { extractChecks } from "./checks.js";
import {
  extractBigint,
  extractDate,
  extractDefault,
  extractLazy,
  extractNumber,
  extractPipe,
  extractSet,
  extractString,
  extractUnion,
} from "./extractors/index.js";
import { makeFallback } from "./fallback.js";
import type { FallbackEntry, ZodSchema } from "./types.js";

export type { FallbackEntry } from "./types.js";

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
  visiting?: Set<unknown>,
): SchemaIR {
  const schema = zodSchema as ZodSchema;
  const def = schema._zod.def;
  const p = currentPath ?? "";
  const v = visiting ?? new Set<unknown>();

  // Track current schema for cycle detection in lazy resolution
  v.add(zodSchema);

  const ir = extractSchemaInner(schema, def, p, v, fallbacks, zodSchema);

  v.delete(zodSchema);
  return ir;
}

function extractSchemaInner(
  schema: ZodSchema,
  def: ZodSchema["_zod"]["def"],
  p: string,
  v: Set<unknown>,
  fallbacks: FallbackEntry[] | undefined,
  zodSchema: unknown,
): SchemaIR {
  switch (def.type) {
    // ── Simple cases (inline) ──────────────────────────────────────────────
    case "boolean":
      return { type: "boolean" };

    case "null":
      return { type: "null" };

    case "undefined":
      return { type: "undefined" };

    case "any":
      return { type: "any" };

    case "unknown":
      return { type: "unknown" };

    case "literal":
      return { type: "literal", values: def.values };

    case "enum":
      return { type: "enum", values: Object.values(def.entries) };

    case "optional":
      return {
        type: "optional",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`, v),
      };

    case "nullable":
      return {
        type: "nullable",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`, v),
      };

    case "readonly":
      return {
        type: "readonly",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`, v),
      };

    case "object": {
      const properties: Record<string, SchemaIR> = {};
      for (const [key, value] of Object.entries(def.shape)) {
        const propPath = `${p}.shape[${JSON.stringify(key)}]`;
        properties[key] = extractSchema(value, fallbacks, propPath, v);
      }
      return { type: "object", properties };
    }

    case "array": {
      const element = extractSchema(def.element, fallbacks, `${p}._zod.def.element`, v);
      const { checkIRs } = def.checks ? extractChecks(def.checks) : { checkIRs: [] };
      return { type: "array", element, checks: checkIRs };
    }

    case "tuple": {
      const items = def.items.map((item, i) =>
        extractSchema(item, fallbacks, `${p}._zod.def.items[${i}]`, v),
      );
      const rest = def.rest ? extractSchema(def.rest, fallbacks, `${p}._zod.def.rest`, v) : null;
      return { type: "tuple", items, rest };
    }

    case "record": {
      if (!def.valueType) {
        return makeFallback("unsupported", zodSchema, fallbacks, p);
      }
      const keyType = extractSchema(def.keyType, fallbacks, `${p}._zod.def.keyType`, v);
      const valueType = extractSchema(def.valueType, fallbacks, `${p}._zod.def.valueType`, v);
      return { type: "record", keyType, valueType };
    }

    case "intersection":
      return {
        type: "intersection",
        left: extractSchema(def.left, fallbacks, `${p}._zod.def.left`, v),
        right: extractSchema(def.right, fallbacks, `${p}._zod.def.right`, v),
      };

    case "map": {
      const keyType = extractSchema(def.keyType, fallbacks, `${p}._zod.def.keyType`, v);
      const valueType = extractSchema(def.valueType, fallbacks, `${p}._zod.def.valueType`, v);
      return { type: "map", keyType, valueType };
    }

    case "lazy":
      return extractLazy(schema, zodSchema, p, fallbacks, extractSchema, v);

    // ── Complex cases (delegated to extractors/) ───────────────────────────
    case "string":
      return extractString(def, zodSchema, p, fallbacks);

    case "number":
      return extractNumber(def, zodSchema, p, fallbacks);

    case "date":
      return extractDate(def);

    case "bigint":
      return extractBigint(def);

    case "set":
      return extractSet(def, p, fallbacks, extractSchema, v);

    case "union":
      return extractUnion(def, p, fallbacks, extractSchema, v);

    case "default":
      return extractDefault(def, zodSchema, p, fallbacks, extractSchema, v);

    case "pipe":
      return extractPipe(def, zodSchema, p, fallbacks, extractSchema, v);

    default:
      return makeFallback("unsupported", zodSchema, fallbacks, p);
  }
}
