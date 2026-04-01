/**
 * SchemaIR — Intermediate representation for Zod schemas.
 * Extracted from Zod's `_zod.def` and `_zod.bag` at build time.
 */

// ─── Check IR ───────────────────────────────────────────────────────────────

export interface CheckMinLength {
  kind: "min_length";
  minimum: number;
}

export interface CheckMaxLength {
  kind: "max_length";
  maximum: number;
}

export interface CheckLengthEquals {
  kind: "length_equals";
  length: number;
}

export interface CheckGreaterThan {
  kind: "greater_than";
  value: number;
  inclusive: boolean;
}

export interface CheckLessThan {
  kind: "less_than";
  value: number;
  inclusive: boolean;
}

export interface CheckMultipleOf {
  kind: "multiple_of";
  value: number;
}

export interface CheckNumberFormat {
  kind: "number_format";
  format: "safeint" | "int32" | "uint32" | "float32" | "float64";
}

export interface CheckStringFormat {
  kind: "string_format";
  format: string;
  pattern?: string;
}

export interface CheckIncludes {
  kind: "includes";
  includes: string;
  position?: number;
}

export interface CheckStartsWith {
  kind: "starts_with";
  prefix: string;
}

export interface CheckEndsWith {
  kind: "ends_with";
  suffix: string;
}

export type CheckIR =
  | CheckMinLength
  | CheckMaxLength
  | CheckLengthEquals
  | CheckGreaterThan
  | CheckLessThan
  | CheckMultipleOf
  | CheckNumberFormat
  | CheckStringFormat
  | CheckIncludes
  | CheckStartsWith
  | CheckEndsWith;

// ─── Refine Effect Check IR ────────────────────────────────────────────────
// Inline refine effects compiled via fn.toString(). Inserted into checks[]
// arrays preserving original Zod check ordering.

export interface RefineEffectCheckIR {
  kind: "refine_effect";
  /** fn.toString() result, e.g. "v => v.includes('@')" */
  source: string;
  /** Custom error message from .refine(fn, "message") or .refine(fn, { message }) */
  message?: string;
}

/** A check entry that may be a compiled check or an inline refine effect. */
export type CheckOrEffectIR = CheckIR | RefineEffectCheckIR;

// ─── Date Check IR ──────────────────────────────────────────────────────────

export interface CheckDateGreaterThan {
  kind: "date_greater_than";
  value: string;
  timestamp: number;
  inclusive: boolean;
}

export interface CheckDateLessThan {
  kind: "date_less_than";
  value: string;
  timestamp: number;
  inclusive: boolean;
}

export type DateCheckIR = CheckDateGreaterThan | CheckDateLessThan;

// ─── BigInt Check IR ───────────────────────────────────────────────────────

export interface CheckBigIntGreaterThan {
  kind: "bigint_greater_than";
  /** String representation of the BigInt value (e.g. "10") */
  value: string;
  inclusive: boolean;
}

export interface CheckBigIntLessThan {
  kind: "bigint_less_than";
  /** String representation of the BigInt value (e.g. "100") */
  value: string;
  inclusive: boolean;
}

export interface CheckBigIntMultipleOf {
  kind: "bigint_multiple_of";
  /** String representation of the BigInt value (e.g. "3") */
  value: string;
}

export type BigIntCheckIR = CheckBigIntGreaterThan | CheckBigIntLessThan | CheckBigIntMultipleOf;

// ─── Set Check IR ──────────────────────────────────────────────────────────

export interface CheckMinSize {
  kind: "min_size";
  minimum: number;
}

export interface CheckMaxSize {
  kind: "max_size";
  maximum: number;
}

export type SetCheckIR = CheckMinSize | CheckMaxSize;

// ─── Schema IR: Primitives ─────────────────────────────────────────────────

export interface StringIR {
  type: "string";
  checks: CheckOrEffectIR[];
  coerce?: boolean;
}

export interface NumberIR {
  type: "number";
  checks: CheckOrEffectIR[];
  coerce?: boolean;
}

export interface BooleanIR {
  type: "boolean";
  coerce?: boolean;
}

export interface BigIntIR {
  type: "bigint";
  checks: BigIntCheckIR[];
  coerce?: boolean;
}

export interface DateIR {
  type: "date";
  checks: DateCheckIR[];
  coerce?: boolean;
}

export interface SymbolIR {
  type: "symbol";
}

export interface NullIR {
  type: "null";
}

export interface UndefinedIR {
  type: "undefined";
}

export interface VoidIR {
  type: "void";
}

export interface NanIR {
  type: "nan";
}

export interface NeverIR {
  type: "never";
}

export interface AnyIR {
  type: "any";
}

export interface UnknownIR {
  type: "unknown";
}

export interface LiteralIR {
  type: "literal";
  values: (string | number | boolean | null)[];
}

export interface EnumIR {
  type: "enum";
  values: string[];
}

// ─── Schema IR: Containers ─────────────────────────────────────────────────

export interface ObjectIR {
  type: "object";
  properties: Record<string, SchemaIR>;
  /** Object-level refine effects from z.object({...}).refine(fn) */
  checks?: RefineEffectCheckIR[];
}

export interface ArrayIR {
  type: "array";
  element: SchemaIR;
  checks: CheckOrEffectIR[];
}

export interface TupleIR {
  type: "tuple";
  items: SchemaIR[];
  rest: SchemaIR | null;
}

export interface RecordIR {
  type: "record";
  keyType: SchemaIR;
  valueType: SchemaIR;
}

export interface SetIR {
  type: "set";
  valueType: SchemaIR;
  checks?: SetCheckIR[];
}

export interface MapIR {
  type: "map";
  keyType: SchemaIR;
  valueType: SchemaIR;
}

// ─── Schema IR: Unions & Intersections ─────────────────────────────────────

export interface UnionIR {
  type: "union";
  options: SchemaIR[];
}

export interface DiscriminatedUnionIR {
  type: "discriminatedUnion";
  discriminator: string;
  options: SchemaIR[];
  mapping: Record<string, number>;
}

export interface IntersectionIR {
  type: "intersection";
  left: SchemaIR;
  right: SchemaIR;
}

// ─── Schema IR: Modifiers ──────────────────────────────────────────────────

export interface OptionalIR {
  type: "optional";
  inner: SchemaIR;
}

export interface NullableIR {
  type: "nullable";
  inner: SchemaIR;
}

export interface ReadonlyIR {
  type: "readonly";
  inner: SchemaIR;
}

export interface DefaultIR {
  type: "default";
  inner: SchemaIR;
  defaultValue: unknown;
}

export interface PipeIR {
  type: "pipe";
  in: SchemaIR;
  out: SchemaIR;
}

// ─── Schema IR: Effects ───────────────────────────────────────────────────

export interface TransformEffectIR {
  type: "effect";
  effectKind: "transform";
  /** fn.toString() result, e.g. "v => v.toLowerCase()" */
  source: string;
  /** The input schema to validate before applying the transform */
  inner: SchemaIR;
}

// ─── Schema IR: Special ────────────────────────────────────────────────────

export interface FallbackIR {
  type: "fallback";
  reason: "transform" | "refine" | "superRefine" | "custom" | "lazy" | "unsupported";
  /** Index into the __fb[] fallback schemas array. Present when partial fallback is used. */
  fallbackIndex?: number;
}

export interface TemplateLiteralIR {
  type: "templateLiteral";
  pattern: string;
}

export interface CatchIR {
  type: "catch";
  inner: SchemaIR;
  defaultValue: unknown;
}

export interface RecursiveRefIR {
  type: "recursiveRef";
}

// ─── Schema IR Union ───────────────────────────────────────────────────────

export type SchemaIR =
  // Primitives
  | StringIR
  | NumberIR
  | BooleanIR
  | BigIntIR
  | DateIR
  | SymbolIR
  | NullIR
  | UndefinedIR
  | VoidIR
  | NanIR
  | NeverIR
  | AnyIR
  | UnknownIR
  | LiteralIR
  | EnumIR
  // Containers
  | ObjectIR
  | ArrayIR
  | TupleIR
  | RecordIR
  | SetIR
  | MapIR
  // Unions & Intersections
  | UnionIR
  | DiscriminatedUnionIR
  | IntersectionIR
  // Modifiers
  | OptionalIR
  | NullableIR
  | ReadonlyIR
  | DefaultIR
  | PipeIR
  // Effects
  | TransformEffectIR
  // Special
  | TemplateLiteralIR
  | CatchIR
  | FallbackIR
  | RecursiveRefIR;

// ─── Compiled Schema Interface ──────────────────────────────────────────────

export interface SafeParseSuccess<T> {
  success: true;
  data: T;
}

export interface SafeParseError {
  success: false;
  error: ZodErrorLike;
}

export type SafeParseResult<T> = SafeParseSuccess<T> | SafeParseError;

export interface ZodIssueLike {
  code: string;
  path: (string | number)[];
  message: string;
  [key: string]: unknown;
}

export interface ZodErrorLike {
  issues: ZodIssueLike[];
}

export interface DiscoveredSchema {
  exportName: string;
  schema: unknown;
}

export interface CompiledSchema<T> {
  parse(input: unknown): T;
  parseAsync(input: unknown): Promise<T>;
  safeParse(input: unknown): SafeParseResult<T>;
  safeParseAsync(input: unknown): Promise<SafeParseResult<T>>;
  schema: unknown;
}
