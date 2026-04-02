/**
 * Fast Path generator: produces a boolean expression string for eligible schemas.
 * When the expression evaluates to `true` at runtime, the input is valid and
 * safeParse can return success immediately without allocating an issues array.
 *
 * Returns `null` if the schema is not eligible for Fast Path (contains coerce,
 * default, catch, date, set/map, transform, refine, or other non-pure constructs).
 */

import type { SchemaIR } from "../../types.js";
import type { CodeGenContext } from "../context.js";
import { escapeString } from "../context.js";
import { fastCheckArray } from "./array.js";
import { fastCheckBigInt } from "./bigint.js";
import { fastCheckDiscriminatedUnion } from "./discriminated-union.js";
import { fastCheckEnum } from "./enum.js";
import { fastCheckIntersection } from "./intersection.js";
import { fastCheckLiteral } from "./literal.js";
import { fastCheckNullable } from "./nullable.js";
import { fastCheckNumber } from "./number.js";
import { fastCheckObject } from "./object.js";
import { fastCheckOptional } from "./optional.js";
import { fastCheckPipe } from "./pipe.js";
import { fastCheckReadonly } from "./readonly.js";
import { fastCheckRecord } from "./record.js";
import { fastCheckString } from "./string.js";
import { fastCheckTuple } from "./tuple.js";
import { fastCheckUnion } from "./union.js";

/**
 * Generate a boolean expression string that validates `inputExpr` against the schema.
 * Returns `null` if the schema (or any nested part) is not eligible for fast checking.
 */
export function generateFastCheck(
  ir: SchemaIR,
  inputExpr: string,
  ctx: CodeGenContext,
): string | null {
  switch (ir.type) {
    // ── Trivially eligible ──────────────────────────────────────────────
    case "any":
    case "unknown":
      return "true";

    // ── NOT ELIGIBLE ────────────────────────────────────────────────────
    case "effect":
    case "fallback":
    case "default":
    case "catch":
    case "date":
    case "set":
    case "map":
      return null;

    // ── Primitives with coerce check ────────────────────────────────────
    case "string":
      if (ir.coerce) return null;
      return fastCheckString(ir, inputExpr, ctx);
    case "number":
      if (ir.coerce) return null;
      return fastCheckNumber(ir, inputExpr);
    case "boolean":
      if (ir.coerce) return null;
      return `typeof ${inputExpr}==="boolean"`;
    case "bigint":
      if (ir.coerce) return null;
      return fastCheckBigInt(ir, inputExpr);

    // ── Simple type checks ──────────────────────────────────────────────
    case "null":
      return `${inputExpr}===null`;
    case "undefined":
      return `${inputExpr}===undefined`;
    case "symbol":
      return `typeof ${inputExpr}==="symbol"`;
    case "void":
      return `${inputExpr}===undefined`;
    case "nan":
      return `typeof ${inputExpr}==="number"&&Number.isNaN(${inputExpr})`;
    case "never":
      return "false";

    // ── Literal ─────────────────────────────────────────────────────────
    case "literal":
      return fastCheckLiteral(ir, inputExpr);

    // ── Enum ────────────────────────────────────────────────────────────
    case "enum":
      return fastCheckEnum(ir, inputExpr, ctx);

    // ── Template literal ────────────────────────────────────────────────
    case "templateLiteral": {
      const regexVar = `__re_tl_${ctx.counter++}`;
      ctx.preamble.push(`var ${regexVar}=new RegExp(${escapeString(ir.pattern)});`);
      return `typeof ${inputExpr}==="string"&&${regexVar}.test(${inputExpr})`;
    }

    // ── Containers ──────────────────────────────────────────────────────
    case "object":
      return fastCheckObject(ir, inputExpr, ctx, generateFastCheck);
    case "array":
      return fastCheckArray(ir, inputExpr, ctx, generateFastCheck);
    case "tuple":
      return fastCheckTuple(ir, inputExpr, ctx, generateFastCheck);
    case "record":
      return fastCheckRecord(ir, inputExpr, ctx, generateFastCheck);

    // ── Modifiers ───────────────────────────────────────────────────────
    case "optional":
      return fastCheckOptional(ir, inputExpr, ctx, generateFastCheck);
    case "nullable":
      return fastCheckNullable(ir, inputExpr, ctx, generateFastCheck);
    case "readonly":
      return fastCheckReadonly(ir, inputExpr, ctx, generateFastCheck);
    case "pipe":
      return fastCheckPipe(ir, inputExpr, ctx, generateFastCheck);

    // ── Unions & Intersections ──────────────────────────────────────────
    case "union":
      return fastCheckUnion(ir, inputExpr, ctx, generateFastCheck);
    case "discriminatedUnion":
      return fastCheckDiscriminatedUnion(ir, inputExpr, ctx, generateFastCheck);
    case "intersection":
      return fastCheckIntersection(ir, inputExpr, ctx, generateFastCheck);

    // ── recursiveRef ────────────────────────────────────────────────────
    case "recursiveRef":
      // recursiveRef needs auxiliary function generation, handled separately
      // For now, mark as ineligible; Step 2 will add support
      return null;
  }
}
