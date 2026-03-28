/**
 * Fast Path generator: produces a boolean expression string for eligible schemas.
 * When the expression evaluates to `true` at runtime, the input is valid and
 * safeParse can return success immediately without allocating an issues array.
 *
 * Returns `null` if the schema is not eligible for Fast Path (contains coerce,
 * default, catch, date, set/map, transform, refine, or other non-pure constructs).
 */

import type {
  ArrayIR,
  DiscriminatedUnionIR,
  EnumIR,
  IntersectionIR,
  LiteralIR,
  NullableIR,
  NumberIR,
  ObjectIR,
  OptionalIR,
  PipeIR,
  ReadonlyIR,
  RecordIR,
  SchemaIR,
  StringIR,
  TupleIR,
  UnionIR,
} from "../types.js";
import type { CodeGenContext } from "./context.js";
import { checkPriority, EMAIL_REGEX_SOURCE, escapeString, UUID_REGEX_SOURCE } from "./context.js";

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
      return fastCheckNumber(ir, inputExpr, ctx);
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
      return fastCheckObject(ir, inputExpr, ctx);
    case "array":
      return fastCheckArray(ir, inputExpr, ctx);
    case "tuple":
      return fastCheckTuple(ir, inputExpr, ctx);
    case "record":
      return fastCheckRecord(ir, inputExpr, ctx);

    // ── Modifiers ───────────────────────────────────────────────────────
    case "optional":
      return fastCheckOptional(ir, inputExpr, ctx);
    case "nullable":
      return fastCheckNullable(ir, inputExpr, ctx);
    case "readonly":
      return fastCheckReadonly(ir, inputExpr, ctx);
    case "pipe":
      return fastCheckPipe(ir, inputExpr, ctx);

    // ── Unions & Intersections ──────────────────────────────────────────
    case "union":
      return fastCheckUnion(ir, inputExpr, ctx);
    case "discriminatedUnion":
      return fastCheckDiscriminatedUnion(ir, inputExpr, ctx);
    case "intersection":
      return fastCheckIntersection(ir, inputExpr, ctx);

    // ── recursiveRef ────────────────────────────────────────────────────
    case "recursiveRef":
      // recursiveRef needs auxiliary function generation, handled separately
      // For now, mark as ineligible; Step 2 will add support
      return null;
  }
}

// ─── String ─────────────────────────────────────────────────────────────────

function fastCheckString(ir: StringIR, x: string, ctx: CodeGenContext): string | null {
  const parts: string[] = [`typeof ${x}==="string"`];

  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "min_length":
        parts.push(`${x}.length>=${check.minimum}`);
        break;
      case "max_length":
        parts.push(`${x}.length<=${check.maximum}`);
        break;
      case "length_equals":
        parts.push(`${x}.length===${check.length}`);
        break;
      case "includes":
        parts.push(
          check.position !== undefined
            ? `${x}.includes(${escapeString(check.includes)},${check.position})`
            : `${x}.includes(${escapeString(check.includes)})`,
        );
        break;
      case "starts_with":
        parts.push(`${x}.startsWith(${escapeString(check.prefix)})`);
        break;
      case "ends_with":
        parts.push(`${x}.endsWith(${escapeString(check.suffix)})`);
        break;
      case "string_format": {
        if (check.format === "email") {
          const v = `__re_email_${ctx.counter++}`;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(EMAIL_REGEX_SOURCE)});`);
          parts.push(`${v}.test(${x})`);
        } else if (check.format === "url") {
          // URL validation uses try/catch — not a pure expression, ineligible
          return null;
        } else if (check.format === "uuid") {
          const v = `__re_uuid_${ctx.counter++}`;
          const pat = check.pattern ?? UUID_REGEX_SOURCE;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(pat)});`);
          parts.push(`${v}.test(${x})`);
        } else if (check.format === "regex" && check.pattern) {
          const v = `__re_${ctx.counter++}`;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(check.pattern)});`);
          parts.push(`${v}.test(${x})`);
        } else if (check.pattern) {
          const v = `__re_${ctx.counter++}`;
          ctx.preamble.push(`var ${v}=new RegExp(${escapeString(check.pattern)});`);
          parts.push(`${v}.test(${x})`);
        } else {
          // Unknown format without pattern — can't generate fast check
          return null;
        }
        break;
      }
    }
  }

  return parts.join("&&");
}

// ─── Number ─────────────────────────────────────────────────────────────────

function fastCheckNumber(ir: NumberIR, x: string, _ctx: CodeGenContext): string | null {
  const parts: string[] = [
    `typeof ${x}==="number"`,
    `!Number.isNaN(${x})`,
    `Number.isFinite(${x})`,
  ];

  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "number_format":
        switch (check.format) {
          case "safeint":
            parts.push(`Number.isSafeInteger(${x})`);
            break;
          case "int32":
            parts.push(`(${x}|0)===${x}`);
            break;
          case "uint32":
            parts.push(`${x}>=0`, `${x}<=4294967295`, `(${x}>>>0)===${x}`);
            break;
          case "float32":
            parts.push(`Math.fround(${x})===${x}`);
            break;
          case "float64":
            // All finite numbers are valid float64
            break;
        }
        break;
      case "greater_than":
        parts.push(check.inclusive ? `${x}>=${check.value}` : `${x}>${check.value}`);
        break;
      case "less_than":
        parts.push(check.inclusive ? `${x}<=${check.value}` : `${x}<${check.value}`);
        break;
      case "multiple_of":
        parts.push(`${x}%${check.value}===0`);
        break;
      case "min_length":
      case "max_length":
      case "length_equals":
      case "string_format":
      case "includes":
      case "starts_with":
      case "ends_with":
        // String-only checks on a number schema — shouldn't happen, skip
        break;
    }
  }

  return parts.join("&&");
}

// ─── BigInt ─────────────────────────────────────────────────────────────────

function fastCheckBigInt(
  ir: SchemaIR & { type: "bigint"; coerce?: boolean },
  x: string,
): string | null {
  const parts: string[] = [`typeof ${x}==="bigint"`];

  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "bigint_greater_than":
        parts.push(check.inclusive ? `${x}>=${check.value}n` : `${x}>${check.value}n`);
        break;
      case "bigint_less_than":
        parts.push(check.inclusive ? `${x}<=${check.value}n` : `${x}<${check.value}n`);
        break;
      case "bigint_multiple_of":
        parts.push(`${x}%${check.value}n===0n`);
        break;
    }
  }

  return parts.join("&&");
}

// ─── Literal ────────────────────────────────────────────────────────────────

function fastCheckLiteral(ir: LiteralIR, x: string): string {
  if (ir.values.length === 1) {
    return `${x}===${JSON.stringify(ir.values[0])}`;
  }
  // Wrap in parens — || has lower precedence than && in parent expressions
  return `(${ir.values.map((v) => `${x}===${JSON.stringify(v)}`).join("||")})`;
}

// ─── Enum ───────────────────────────────────────────────────────────────────

function fastCheckEnum(ir: EnumIR, x: string, ctx: CodeGenContext): string {
  if (ir.values.length <= 3) {
    // Inline equality checks for small enums, wrapped in parens for precedence safety
    return `(${ir.values.map((v) => `${x}===${escapeString(v)}`).join("||")})`;
  }
  // Use Set for larger enums
  const setVar = `__enumSet_${ctx.counter++}`;
  ctx.preamble.push(`var ${setVar}=new Set(${JSON.stringify(ir.values)});`);
  return `${setVar}.has(${x})`;
}

// ─── Object ─────────────────────────────────────────────────────────────────

function fastCheckObject(ir: ObjectIR, x: string, ctx: CodeGenContext): string | null {
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  for (const [key, propIR] of Object.entries(ir.properties)) {
    const propExpr = `${x}[${escapeString(key)}]`;
    const propCheck = generateFastCheck(propIR, propExpr, ctx);
    if (propCheck === null) return null; // All-or-nothing
    parts.push(propCheck);
  }

  return parts.join("&&");
}

// ─── Array ──────────────────────────────────────────────────────────────────

function fastCheckArray(ir: ArrayIR, x: string, ctx: CodeGenContext): string | null {
  const parts: string[] = [`Array.isArray(${x})`];

  // Size checks
  for (const check of [...ir.checks].sort(checkPriority)) {
    switch (check.kind) {
      case "min_length":
        parts.push(`${x}.length>=${check.minimum}`);
        break;
      case "max_length":
        parts.push(`${x}.length<=${check.maximum}`);
        break;
      case "length_equals":
        parts.push(`${x}.length===${check.length}`);
        break;
    }
  }

  // Element validation via .every()
  const elemVar = `__fe_${ctx.counter++}`;
  const elemCheck = generateFastCheck(ir.element, elemVar, ctx);
  if (elemCheck === null) return null;
  if (elemCheck !== "true") {
    parts.push(`${x}.every(${elemVar}=>${elemCheck})`);
  }

  return parts.join("&&");
}

// ─── Tuple ──────────────────────────────────────────────────────────────────

function fastCheckTuple(ir: TupleIR, x: string, ctx: CodeGenContext): string | null {
  const parts: string[] = [`Array.isArray(${x})`];

  if (ir.rest === null) {
    parts.push(`${x}.length===${ir.items.length}`);
  } else {
    parts.push(`${x}.length>=${ir.items.length}`);
  }

  // Per-index checks
  for (let i = 0; i < ir.items.length; i++) {
    const itemIR = ir.items[i];
    if (!itemIR) continue;
    const itemCheck = generateFastCheck(itemIR, `${x}[${i}]`, ctx);
    if (itemCheck === null) return null;
    if (itemCheck !== "true") parts.push(itemCheck);
  }

  // Rest element
  if (ir.rest !== null) {
    const rv = `__tr_${ctx.counter++}`;
    const restCheck = generateFastCheck(ir.rest, rv, ctx);
    if (restCheck === null) return null;
    if (restCheck !== "true") {
      parts.push(`${x}.slice(${ir.items.length}).every(${rv}=>${restCheck})`);
    }
  }

  return parts.join("&&");
}

// ─── Record ─────────────────────────────────────────────────────────────────

function fastCheckRecord(ir: RecordIR, x: string, ctx: CodeGenContext): string | null {
  const parts: string[] = [`typeof ${x}==="object"`, `${x}!==null`, `!Array.isArray(${x})`];

  const kv = `__rk_${ctx.counter++}`;
  const keyCheck = generateFastCheck(ir.keyType, kv, ctx);
  const valCheck = generateFastCheck(ir.valueType, `${x}[${kv}]`, ctx);
  if (keyCheck === null || valCheck === null) return null;

  const conditions: string[] = [];
  if (keyCheck !== "true") conditions.push(keyCheck);
  if (valCheck !== "true") conditions.push(valCheck);

  if (conditions.length > 0) {
    parts.push(`Object.keys(${x}).every(${kv}=>${conditions.join("&&")})`);
  }

  return parts.join("&&");
}

// ─── Optional ───────────────────────────────────────────────────────────────

function fastCheckOptional(ir: OptionalIR, x: string, ctx: CodeGenContext): string | null {
  const inner = generateFastCheck(ir.inner, x, ctx);
  if (inner === null) return null;
  return `(${x}===undefined||(${inner}))`;
}

// ─── Nullable ───────────────────────────────────────────────────────────────

function fastCheckNullable(ir: NullableIR, x: string, ctx: CodeGenContext): string | null {
  const inner = generateFastCheck(ir.inner, x, ctx);
  if (inner === null) return null;
  return `(${x}===null||(${inner}))`;
}

// ─── Readonly ───────────────────────────────────────────────────────────────

function fastCheckReadonly(ir: ReadonlyIR, x: string, ctx: CodeGenContext): string | null {
  return generateFastCheck(ir.inner, x, ctx);
}

// ─── Pipe ───────────────────────────────────────────────────────────────────

function fastCheckPipe(ir: PipeIR, x: string, ctx: CodeGenContext): string | null {
  // Only eligible if `out` is the same as `in` (non-transform pipe)
  // We check `in` only — if the pipe has a transform, `out` would be a fallback
  const inCheck = generateFastCheck(ir.in, x, ctx);
  if (inCheck === null) return null;
  // Check if out schema is eligible (non-fallback)
  const outCheck = generateFastCheck(ir.out, x, ctx);
  if (outCheck === null) return null;
  // Both in and out must pass
  return inCheck === "true" ? outCheck : outCheck === "true" ? inCheck : `${inCheck}&&${outCheck}`;
}

// ─── Union ──────────────────────────────────────────────────────────────────

function fastCheckUnion(ir: UnionIR, x: string, ctx: CodeGenContext): string | null {
  const optionChecks: string[] = [];
  for (const option of ir.options) {
    const check = generateFastCheck(option, x, ctx);
    if (check === null) return null;
    optionChecks.push(`(${check})`);
  }
  // Wrap in parens — || has lower precedence than && in parent expressions
  return `(${optionChecks.join("||")})`;
}

// ─── Discriminated Union ────────────────────────────────────────────────────

function fastCheckDiscriminatedUnion(
  ir: DiscriminatedUnionIR,
  x: string,
  ctx: CodeGenContext,
): string | null {
  // Generate checks for each branch, keyed by discriminator value
  const branchChecks: string[] = [];
  for (const option of ir.options) {
    const check = generateFastCheck(option, x, ctx);
    if (check === null) return null;
    branchChecks.push(`(${check})`);
  }
  // Combine as || chain, wrapped for precedence safety
  return `(${branchChecks.join("||")})`;
}

// ─── Intersection ───────────────────────────────────────────────────────────

function fastCheckIntersection(ir: IntersectionIR, x: string, ctx: CodeGenContext): string | null {
  const left = generateFastCheck(ir.left, x, ctx);
  if (left === null) return null;
  const right = generateFastCheck(ir.right, x, ctx);
  if (right === null) return null;
  return left === "true" ? right : right === "true" ? left : `${left}&&${right}`;
}
