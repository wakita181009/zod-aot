/**
 * IR-driven arbitrary registry for property-based testing.
 *
 * Each SchemaIR type has a corresponding arbitrary generator that produces
 * inputs likely to exercise both valid and invalid paths. The registry uses
 * the same `satisfies` pattern as codegen registries for compile-time
 * exhaustiveness: adding a new SchemaIR type without an arbitrary is a
 * compiler error.
 *
 * Generators receive `genChild` for recursive dispatch into nested schemas.
 * Leaf types (string, number, etc.) ignore it.
 */

import fc from "fast-check";
import type { SchemaIR } from "#src/core/types.js";

type SchemaIRType = SchemaIR["type"];

/**
 * Arbitrary generator function. Receives the IR node and a recursive dispatcher
 * for child schemas. Returns an fc.Arbitrary that produces values likely to
 * exercise the schema's validation paths (both valid and invalid).
 */
type ArbitraryGen = (ir: SchemaIR, genChild: ArbitraryGenFn) => fc.Arbitrary<unknown>;
type ArbitraryGenFn = (ir: SchemaIR) => fc.Arbitrary<unknown>;

// ─── Leaf Arbitraries ─────────────────────────────────────────────────────────

function arbString(ir: Extract<SchemaIR, { type: "string" }>): fc.Arbitrary<unknown> {
  const minLen = ir.checks.find((c) => c.kind === "min_length");
  const maxLen = ir.checks.find((c) => c.kind === "max_length");
  const min = minLen && "minimum" in minLen ? (minLen.minimum as number) : 0;
  const max = maxLen && "maximum" in maxLen ? (maxLen.maximum as number) : 100;

  return fc.oneof(
    // Valid strings within constraints
    fc.string({ minLength: min, maxLength: max }),
    // Boundary: exact min/max length
    fc.constant("a".repeat(min)),
    fc.constant("a".repeat(Math.min(max, 200))),
    // Invalid type
    fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
    // Edge: empty, unicode
    fc.constant(""),
    fc.string({ minLength: 0, maxLength: 20 }),
  );
}

function arbNumber(ir: Extract<SchemaIR, { type: "number" }>): fc.Arbitrary<unknown> {
  const hasInt = ir.checks.some((c) => c.kind === "number_format");
  const gtCheck = ir.checks.find((c) => c.kind === "greater_than");
  const ltCheck = ir.checks.find((c) => c.kind === "less_than");
  const lo = gtCheck && "value" in gtCheck ? (gtCheck.value as number) : -1e6;
  const hi = ltCheck && "value" in ltCheck ? (ltCheck.value as number) : 1e6;

  return fc.oneof(
    // Valid: in range
    hasInt
      ? fc.integer({ min: Math.ceil(lo), max: Math.floor(hi) })
      : fc.double({ min: lo, max: hi, noNaN: true }),
    // Boundary
    fc.constant(lo),
    fc.constant(hi),
    // Invalid type
    fc.oneof(fc.string(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
    // Edge: NaN, Infinity, -0
    fc.constant(NaN),
    fc.constant(Infinity),
    fc.constant(-Infinity),
    fc.constant(0),
    fc.constant(-0),
  );
}

function arbBoolean(): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.boolean(),
    fc.oneof(
      fc.integer(),
      fc.string(),
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(0),
      fc.constant(1),
    ),
  );
}

function arbBigInt(ir: Extract<SchemaIR, { type: "bigint" }>): fc.Arbitrary<unknown> {
  const gtCheck = ir.checks.find((c) => c.kind === "bigint_greater_than");
  const ltCheck = ir.checks.find((c) => c.kind === "bigint_less_than");
  const lo = gtCheck && "value" in gtCheck ? BigInt(gtCheck.value as string) : -1000n;
  const hi = ltCheck && "value" in ltCheck ? BigInt(ltCheck.value as string) : 1000n;

  return fc.oneof(
    fc.bigInt({ min: lo, max: hi }),
    fc.constant(lo),
    fc.constant(hi),
    fc.oneof(fc.integer(), fc.string(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbDate(): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.date(),
    fc.constant(new Date("invalid")),
    fc.oneof(fc.integer(), fc.string(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbSymbol(): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.constant(Symbol("test")),
    fc.constant(Symbol.for("test")),
    fc.oneof(fc.string(), fc.integer(), fc.constant(null)),
  );
}

function arbNull(): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(null), fc.constant(undefined), fc.string(), fc.integer());
}

function arbUndefined(): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(undefined), fc.constant(null), fc.string(), fc.integer());
}

function arbVoid(): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(undefined), fc.constant(null), fc.string(), fc.integer());
}

function arbNan(): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(NaN), fc.integer(), fc.string(), fc.constant(null));
}

function arbNever(): fc.Arbitrary<unknown> {
  // never accepts nothing, generate various types to confirm rejection
  return fc.anything();
}

function arbAny(): fc.Arbitrary<unknown> {
  return fc.anything();
}

function arbUnknown(): fc.Arbitrary<unknown> {
  return fc.anything();
}

function arbLiteral(ir: Extract<SchemaIR, { type: "literal" }>): fc.Arbitrary<unknown> {
  return fc.oneof(
    // Valid: one of the literal values
    fc.constantFrom(...ir.values),
    // Invalid: other types
    fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbEnum(ir: Extract<SchemaIR, { type: "enum" }>): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.constantFrom(...ir.values),
    fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.constant(undefined)),
  );
}

// ─── Container Arbitraries ────────────────────────────────────────────────────

function arbObject(
  ir: Extract<SchemaIR, { type: "object" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  const keys = Object.keys(ir.properties);
  if (keys.length === 0) {
    return fc.oneof(fc.constant({}), fc.constant(null), fc.string(), fc.constant(undefined));
  }

  // Build a record of arbitraries for each property
  const propArbs: Record<string, fc.Arbitrary<unknown>> = {};
  for (const [key, propIR] of Object.entries(ir.properties)) {
    propArbs[key] = genChild(propIR);
  }

  return fc.oneof(
    fc.record(propArbs),
    // Invalid: not an object
    fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.constant(undefined), fc.constant([])),
  );
}

function arbArray(
  ir: Extract<SchemaIR, { type: "array" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  const minCheck = ir.checks.find((c) => c.kind === "min_length");
  const maxCheck = ir.checks.find((c) => c.kind === "max_length");
  const min = minCheck && "minimum" in minCheck ? (minCheck.minimum as number) : 0;
  const max = maxCheck && "maximum" in maxCheck ? (maxCheck.maximum as number) : 10;

  return fc.oneof(
    fc.array(genChild(ir.element), { minLength: min, maxLength: max }),
    fc.constant([]),
    fc.oneof(fc.string(), fc.integer(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbTuple(
  ir: Extract<SchemaIR, { type: "tuple" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  const itemArbs = ir.items.map((item) => genChild(item));
  if (itemArbs.length === 0) return fc.oneof(fc.constant([]), fc.anything());

  return fc.oneof(
    fc.tuple(...(itemArbs as [fc.Arbitrary<unknown>, ...fc.Arbitrary<unknown>[]])),
    fc.constant([]),
    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbRecord(
  ir: Extract<SchemaIR, { type: "record" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), genChild(ir.valueType), {
      minKeys: 0,
      maxKeys: 5,
    }),
    fc.constant({}),
    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbSet(
  ir: Extract<SchemaIR, { type: "set" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc.array(genChild(ir.valueType), { minLength: 0, maxLength: 5 }).map((arr) => new Set(arr)),
    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined), fc.constant([])),
  );
}

function arbMap(
  ir: Extract<SchemaIR, { type: "map" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return fc.oneof(
    fc
      .array(fc.tuple(genChild(ir.keyType), genChild(ir.valueType)), { minLength: 0, maxLength: 5 })
      .map((entries) => new Map(entries as [unknown, unknown][])),
    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
  );
}

// ─── Union & Intersection Arbitraries ─────────────────────────────────────────

function arbUnion(
  ir: Extract<SchemaIR, { type: "union" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  if (ir.options.length === 0) return fc.anything();
  const optionArbs = ir.options.map((opt) => genChild(opt));
  return fc.oneof(...(optionArbs as [fc.Arbitrary<unknown>, ...fc.Arbitrary<unknown>[]]));
}

function arbDiscriminatedUnion(
  ir: Extract<SchemaIR, { type: "discriminatedUnion" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  if (ir.options.length === 0) return fc.anything();
  const optionArbs = ir.options.map((opt) => genChild(opt));
  return fc.oneof(
    ...(optionArbs as [fc.Arbitrary<unknown>, ...fc.Arbitrary<unknown>[]]),
    // Invalid discriminator
    fc.constant({ [ir.discriminator]: "__invalid__" }),
    fc.oneof(fc.string(), fc.constant(null)),
  );
}

function arbIntersection(
  ir: Extract<SchemaIR, { type: "intersection" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  // Intersection is hard to generate valid inputs for. Use left side as primary.
  return fc.oneof(genChild(ir.left), genChild(ir.right), fc.anything());
}

// ─── Modifier Arbitraries ─────────────────────────────────────────────────────

function arbOptional(
  ir: Extract<SchemaIR, { type: "optional" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(undefined), genChild(ir.inner));
}

function arbNullable(
  ir: Extract<SchemaIR, { type: "nullable" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(null), genChild(ir.inner));
}

function arbReadonly(
  ir: Extract<SchemaIR, { type: "readonly" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return genChild(ir.inner);
}

function arbDefault(
  ir: Extract<SchemaIR, { type: "default" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return fc.oneof(fc.constant(undefined), genChild(ir.inner));
}

function arbPipe(
  ir: Extract<SchemaIR, { type: "pipe" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  return genChild(ir.in);
}

// ─── Effect Arbitraries ───────────────────────────────────────────────────────

function arbEffect(
  ir: Extract<SchemaIR, { type: "effect" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  // Generate inputs that would be valid for the inner schema (transform runs after validation)
  return genChild(ir.inner);
}

// ─── Special Arbitraries ──────────────────────────────────────────────────────

function arbTemplateLiteral(
  ir: Extract<SchemaIR, { type: "templateLiteral" }>,
): fc.Arbitrary<unknown> {
  // Generate strings matching and not matching the pattern
  return fc.oneof(
    fc.stringMatching(new RegExp(ir.pattern)),
    fc.string(),
    fc.oneof(fc.integer(), fc.constant(null), fc.constant(undefined)),
  );
}

function arbCatch(
  ir: Extract<SchemaIR, { type: "catch" }>,
  genChild: ArbitraryGenFn,
): fc.Arbitrary<unknown> {
  // catch always succeeds, but test with both valid and invalid inner inputs
  return fc.oneof(genChild(ir.inner), fc.anything());
}

function arbFallback(): fc.Arbitrary<unknown> {
  // Fallback delegates to Zod, so any input works for differential testing
  return fc.anything();
}

function arbRecursiveRef(): fc.Arbitrary<unknown> {
  // recursiveRef points back to the root schema; for PBT we generate simple values
  // to avoid infinite recursion. Depth is controlled at the dispatch level.
  return fc.anything();
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const arbitraryRegistry = {
  // Primitives
  string: (ir, _gc) => arbString(ir as Extract<SchemaIR, { type: "string" }>),
  number: (ir, _gc) => arbNumber(ir as Extract<SchemaIR, { type: "number" }>),
  boolean: (_ir, _gc) => arbBoolean(),
  bigint: (ir, _gc) => arbBigInt(ir as Extract<SchemaIR, { type: "bigint" }>),
  date: (_ir, _gc) => arbDate(),
  symbol: (_ir, _gc) => arbSymbol(),
  null: (_ir, _gc) => arbNull(),
  undefined: (_ir, _gc) => arbUndefined(),
  void: (_ir, _gc) => arbVoid(),
  nan: (_ir, _gc) => arbNan(),
  never: (_ir, _gc) => arbNever(),
  any: (_ir, _gc) => arbAny(),
  unknown: (_ir, _gc) => arbUnknown(),
  literal: (ir, _gc) => arbLiteral(ir as Extract<SchemaIR, { type: "literal" }>),
  enum: (ir, _gc) => arbEnum(ir as Extract<SchemaIR, { type: "enum" }>),
  // Containers
  object: (ir, gc) => arbObject(ir as Extract<SchemaIR, { type: "object" }>, gc),
  array: (ir, gc) => arbArray(ir as Extract<SchemaIR, { type: "array" }>, gc),
  tuple: (ir, gc) => arbTuple(ir as Extract<SchemaIR, { type: "tuple" }>, gc),
  record: (ir, gc) => arbRecord(ir as Extract<SchemaIR, { type: "record" }>, gc),
  set: (ir, gc) => arbSet(ir as Extract<SchemaIR, { type: "set" }>, gc),
  map: (ir, gc) => arbMap(ir as Extract<SchemaIR, { type: "map" }>, gc),
  // Unions & Intersections
  union: (ir, gc) => arbUnion(ir as Extract<SchemaIR, { type: "union" }>, gc),
  discriminatedUnion: (ir, gc) =>
    arbDiscriminatedUnion(ir as Extract<SchemaIR, { type: "discriminatedUnion" }>, gc),
  intersection: (ir, gc) => arbIntersection(ir as Extract<SchemaIR, { type: "intersection" }>, gc),
  // Modifiers
  optional: (ir, gc) => arbOptional(ir as Extract<SchemaIR, { type: "optional" }>, gc),
  nullable: (ir, gc) => arbNullable(ir as Extract<SchemaIR, { type: "nullable" }>, gc),
  readonly: (ir, gc) => arbReadonly(ir as Extract<SchemaIR, { type: "readonly" }>, gc),
  default: (ir, gc) => arbDefault(ir as Extract<SchemaIR, { type: "default" }>, gc),
  pipe: (ir, gc) => arbPipe(ir as Extract<SchemaIR, { type: "pipe" }>, gc),
  // Effects
  effect: (ir, gc) => arbEffect(ir as Extract<SchemaIR, { type: "effect" }>, gc),
  // Special
  templateLiteral: (ir, _gc) =>
    arbTemplateLiteral(ir as Extract<SchemaIR, { type: "templateLiteral" }>),
  catch: (ir, gc) => arbCatch(ir as Extract<SchemaIR, { type: "catch" }>, gc),
  fallback: (_ir, _gc) => arbFallback(),
  recursiveRef: (_ir, _gc) => arbRecursiveRef(),
} satisfies Record<SchemaIRType, ArbitraryGen>;

// ─── Dispatcher ───────────────────────────────────────────────────────────────

const MAX_DEPTH = 3;

/**
 * Generate an arbitrary for a given SchemaIR node.
 * Dispatches to the appropriate generator via the typed registry.
 * Depth-limited to MAX_DEPTH for recursive schemas.
 */
export function generateArbitrary(ir: SchemaIR, depth = 0): fc.Arbitrary<unknown> {
  if (depth > MAX_DEPTH) {
    return fc.anything();
  }
  const gen = arbitraryRegistry[ir.type];
  return gen(ir, (childIr) => generateArbitrary(childIr, depth + 1));
}
