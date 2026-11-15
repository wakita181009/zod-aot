import type { SchemaIR, StringCheckIR } from "../../types.js";
import {
  type CheckFallbackReason,
  checkedExtractor,
  mapLengthCheck,
  mapRefineCheck,
} from "../checks.js";
import { tryCompileEffect } from "../effects.js";
import type { ExtractorContext, ZodCheckDef, ZodDef } from "../types.js";

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

function mapStringCheck(def: ZodCheckDef): StringCheckIR | CheckFallbackReason {
  switch (def.check) {
    case "string_format":
      return mapStringFormat(def);
    case "overwrite": {
      // Backs .trim(), .toLowerCase(), .toUpperCase(); capturing transforms fall back.
      const source = tryCompileEffect(def.tx);
      return source ? { kind: "overwrite_effect", source } : "unsupported";
    }
    case "custom":
      return mapRefineCheck(def);
    default:
      return mapLengthCheck(def) ?? "unsupported";
  }
}

function mapStringFormat(def: ZodCheckDef): StringCheckIR | CheckFallbackReason {
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
  // z.stringFormat(name, fnOrRegex) validates via `fn` and reports a different
  // issue shape, even when `name` matches a built-in format.
  if (typeof def.fn === "function") return "unsupported";
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

function extractString(def: ZodDef, _ctx: ExtractorContext, checks: StringCheckIR[]): SchemaIR {
  return { type: "string", checks, ...(def.coerce ? { coerce: true as const } : {}) };
}

export const stringExtractor = checkedExtractor(mapStringCheck, extractString);
