import type { SchemaIR } from "../types.js";
import { extractChecks } from "./checks.js";
import {
  extractBigint,
  extractDate,
  extractDefault,
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
): SchemaIR {
  const schema = zodSchema as ZodSchema;
  const def = schema._zod.def;
  const p = currentPath ?? "";

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
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`),
      };

    case "nullable":
      return {
        type: "nullable",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`),
      };

    case "readonly":
      return {
        type: "readonly",
        inner: extractSchema(def.innerType, fallbacks, `${p}._zod.def.innerType`),
      };

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

    case "intersection":
      return {
        type: "intersection",
        left: extractSchema(def.left, fallbacks, `${p}._zod.def.left`),
        right: extractSchema(def.right, fallbacks, `${p}._zod.def.right`),
      };

    case "map": {
      const keyType = extractSchema(def.keyType, fallbacks, `${p}._zod.def.keyType`);
      const valueType = extractSchema(def.valueType, fallbacks, `${p}._zod.def.valueType`);
      return { type: "map", keyType, valueType };
    }

    case "lazy":
      return makeFallback("lazy", zodSchema, fallbacks, p);

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
      return extractSet(def, p, fallbacks, extractSchema);

    case "union":
      return extractUnion(def, p, fallbacks, extractSchema);

    case "default":
      return extractDefault(def, zodSchema, p, fallbacks, extractSchema);

    case "pipe":
      return extractPipe(def, zodSchema, p, fallbacks, extractSchema);

    default:
      return makeFallback("unsupported", zodSchema, fallbacks, p);
  }
}
